import {
  RECOMMEND_ENDPOINT,
  HEALTH_ENDPOINT,
  RECOMMENDER_TIMEOUT_MS,
} from "../config/constants.js";
import { fetchWithTimeout, searchMovie, getMovieDetails } from "./tmdbApi.js";
import { normalizeRecommenderResponse } from "../utils/movieMappers.js";
import { devLog } from "../utils/devLog.js";

const DEFAULT_TOP_K = 12;
const MIN_SYNOPSIS_CHARS = 10;
const MAX_SYNOPSIS_CHARS = 5000;

export function clampTopK(topK) {
  const n = Number(topK);
  if (!Number.isFinite(n)) return DEFAULT_TOP_K;
  return Math.min(50, Math.max(1, Math.round(n)));
}

/**
 * Payload limpo para POST /api/v1/recommend (sem dados TMDb ricos).
 */
export function buildRecommendationPayloadFromMovie(movie, topK = DEFAULT_TOP_K) {
  const genres = Array.isArray(movie?.genres)
    ? movie.genres
        .map((genre) => (typeof genre === "string" ? genre : genre?.name))
        .filter(Boolean)
        .join(", ")
    : "";

  const releaseDate = movie?.releaseDate || movie?.release_date;
  const year =
    movie?.year ||
    (releaseDate ? Number(String(releaseDate).slice(0, 4)) : undefined);

  let synopsis = String(movie?.overview || movie?.synopsis || "").trim();
  const title = movie?.title || movie?.name || undefined;

  if (synopsis.length < MIN_SYNOPSIS_CHARS) {
    synopsis = [title, synopsis].filter(Boolean).join(". ").trim();
  }
  if (synopsis.length < MIN_SYNOPSIS_CHARS) {
    synopsis = `${title || "Film"} — cinematic recommendation based on genre and metadata.`;
  }

  return {
    synopsis,
    genre: genres || undefined,
    year: Number.isFinite(year) ? year : undefined,
    title,
    topK: clampTopK(topK),
  };
}

export function isThematicQuery(query) {
  const text = String(query || "").trim();
  if (text.length < MIN_SYNOPSIS_CHARS) return false;
  const words = text.split(/\s+/).filter(Boolean).length;
  return (
    words >= 3 ||
    /\b(about|like|films?|movies?|theme|mood|thriller|horror|drama|sci-fi|identity|dreams)\b/i.test(
      text
    )
  );
}

/**
 * Monta payload para busca: tema longo → synopsis direta; título → TMDb primeiro.
 */
export async function buildRecommendationPayloadFromQuery(query, topK = DEFAULT_TOP_K) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) {
    throw new Error("Query is required");
  }

  if (isThematicQuery(trimmed)) {
    return { synopsis: trimmed, topK: clampTopK(topK) };
  }

  try {
    const results = await searchMovie(trimmed, { limit: 1 });
    if (results[0]?.id) {
      const details = await getMovieDetails(results[0].id);
      if (details) {
        return buildRecommendationPayloadFromMovie(details, topK);
      }
    }
  } catch (error) {
    devLog("[CineScope] TMDb lookup for query failed:", error.message);
  }

  if (trimmed.length < MIN_SYNOPSIS_CHARS) {
    const err = new Error(
      "Try describing a movie, theme, or mood with a little more detail."
    );
    err.code = "QUERY_TOO_SHORT";
    throw err;
  }

  return { synopsis: trimmed, topK: clampTopK(topK) };
}

function buildRequestBody({ synopsis, genre, year, title, topK }) {
  const cleanSynopsis = String(synopsis || "").trim();

  if (cleanSynopsis.length < MIN_SYNOPSIS_CHARS) {
    throw new Error("Synopsis must have at least 10 characters.");
  }

  const body = {
    synopsis: cleanSynopsis.substring(0, MAX_SYNOPSIS_CHARS),
    top_k: clampTopK(topK),
  };

  if (genre) body.genre = String(genre).trim().substring(0, 500);
  if (title) body.title = String(title).trim().substring(0, 200);
  if (year != null && year !== "") {
    const y = Number(year);
    if (Number.isFinite(y) && y >= 1888 && y <= 2100) body.year = y;
  }

  return body;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/v1/recommend — retorna JSON bruto da API.
 */
export async function getRecommendations({
  synopsis,
  genre,
  year,
  title,
  topK = DEFAULT_TOP_K,
  signal,
}) {
  const body = buildRequestBody({ synopsis, genre, year, title, topK });
  if (import.meta.env.DEV) {
    console.log("[CineScope] payload sent to recommender", body);
  }

  const response = await fetch(RECOMMEND_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody?.detail ||
      errorBody?.message ||
      `Recommender API error: ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  if (import.meta.env.DEV) {
    const rawCount = Array.isArray(data)
      ? data.length
      : data?.recommendations?.length ?? data?.count ?? null;
    console.log("[CineScope] raw recommender response", data);
    console.log("[CineScope] raw recommender count", { rawCount, top_k: body.top_k });
  }
  return data;
}

async function getRecommendationsWithRetry(params, options = {}) {
  const { retries = 1, timeout = RECOMMENDER_TIMEOUT_MS } = options;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const data = await getRecommendations({ ...params, signal: controller.signal });
      clearTimeout(timer);
      return data;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;

      // A cold serverless instance can 503 while the engine loads; anything
      // else is a real failure and should surface immediately.
      const retriable =
        error.message?.includes("503") ||
        error.name === "AbortError" ||
        error.name === "TypeError" ||
        error.message?.includes("Failed to fetch");

      if (retriable && attempt < retries) {
        await sleep(600);
        continue;
      }

      if (error.name === "AbortError") {
        throw new Error("The recommendation engine took too long to respond.", {
          cause: error,
        });
      }
      if (retriable) {
        throw new Error("The recommendation engine is unavailable right now.", {
          cause: error,
        });
      }

      throw error;
    }
  }

  throw lastError;
}

/** Filme TMDb conhecido → recommender → lista normalizada básica. */
export async function fetchRecommendations(movieId, movieDetails, options = {}) {
  const { topK = DEFAULT_TOP_K, ...requestOptions } = options;
  const payload = buildRecommendationPayloadFromMovie(movieDetails, topK);
  const response = await getRecommendationsWithRetry(payload, requestOptions);
  const normalized = normalizeRecommenderResponse(response);
  const filtered = normalized.filter((item) => item.movieId && item.movieId !== movieId);
  if (import.meta.env.DEV) {
    console.log("[CineScope] normalized recommendations", filtered);
    console.log({
      rawCount: Array.isArray(response)
        ? response.length
        : response?.recommendations?.length ?? response?.count,
      normalizedCount: normalized.length,
      afterSourceExclusion: filtered.length,
      topK: payload.topK,
    });
  }
  return filtered;
}

/** Query / tema → payload → recommender → lista normalizada básica. */
export async function fetchRecommendationsBySynopsis(synopsis, topK = DEFAULT_TOP_K, options = {}) {
  const payload = await buildRecommendationPayloadFromQuery(synopsis, topK);
  const response = await getRecommendationsWithRetry(payload, options);
  const normalized = normalizeRecommenderResponse(response);
  if (import.meta.env.DEV) {
    console.log("[CineScope] normalized recommendations", normalized);
    console.log({
      rawCount: Array.isArray(response)
        ? response.length
        : response?.recommendations?.length ?? response?.count,
      normalizedCount: normalized.length,
      topK: payload.topK,
    });
  }
  return normalized;
}

/** @deprecated use buildRecommendationPayloadFromMovie */
export const buildRecommendRequestFromMovie = buildRecommendationPayloadFromMovie;

export async function checkRecommenderHealth() {
  try {
    const response = await fetchWithTimeout(HEALTH_ENDPOINT, {}, 8000);
    if (!response.ok) return { ok: false, modelLoaded: false, statusCode: response.status };
    const data = await response.json();
    return {
      ok: data.status === "healthy" && Boolean(data.model_loaded),
      modelLoaded: Boolean(data.model_loaded),
      indexedMovies: data.count ?? null,
      statusCode: response.status,
    };
  } catch {
    return { ok: false, modelLoaded: false, statusCode: null };
  }
}
