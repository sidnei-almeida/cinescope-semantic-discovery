import {
  TMDB_BASE_URL,
  REQUEST_TIMEOUT_MS,
  LONG_REQUEST_TIMEOUT_MS,
} from "../config/constants.js";
import { TMDB_IMAGE_BASE, POSTER_SIZE, BACKDROP_SIZE } from "../config/constants.js";
import { buildImageUrl } from "../utils/movieFallbacks.js";
import {
  TMDB_API_KEY,
  TMDB_READ_TOKEN,
  hasTmdbCredentials,
} from "../config/tmdbCredentials.js";

export { hasTmdbCredentials };

export async function fetchWithTimeout(
  resource,
  options = {},
  timeout = REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Centraliza chamadas ao TMDb.
 * Preferência: Bearer token se disponível; senão api_key como query param.
 */
export async function tmdbFetch(endpoint, params = {}, timeout = REQUEST_TIMEOUT_MS) {
  if (!hasTmdbCredentials()) {
    throw new Error("Missing TMDb credentials.");
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  if (TMDB_API_KEY && !TMDB_READ_TOKEN) {
    url.searchParams.set("api_key", TMDB_API_KEY);
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const headers = TMDB_READ_TOKEN
    ? {
        Authorization: `Bearer ${TMDB_READ_TOKEN}`,
        "Content-Type": "application/json;charset=utf-8",
      }
    : { "Content-Type": "application/json;charset=utf-8" };

  const response = await fetchWithTimeout(url.toString(), { headers }, timeout);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `TMDb request failed (${response.status}): ${errorText || response.statusText}`
    );
  }

  return response.json();
}

export async function searchMovie(query, options = {}) {
  const { limit = 8, timeout = REQUEST_TIMEOUT_MS, year } = options;
  if (!query?.trim()) return [];

  const params = {
    query: query.trim(),
    include_adult: false,
    language: "en-US",
    page: 1,
  };

  if (year != null && Number.isFinite(Number(year))) {
    params.year = Number(year);
  }

  const data = await tmdbFetch("/search/movie", params, timeout);

  return Array.isArray(data?.results) ? data.results.slice(0, limit) : [];
}

export async function getMovieDetails(
  movieId,
  append = "credits,videos,keywords,external_ids",
  timeout = LONG_REQUEST_TIMEOUT_MS
) {
  return tmdbFetch(
    `/movie/${movieId}`,
    { language: "en-US", append_to_response: append },
    timeout
  );
}

export async function getMovieExternalIds(movieId, timeout = REQUEST_TIMEOUT_MS) {
  return tmdbFetch(`/movie/${movieId}/external_ids`, {}, timeout);
}

export async function getMovieCredits(movieId, timeout = REQUEST_TIMEOUT_MS) {
  return tmdbFetch(`/movie/${movieId}/credits`, { language: "en-US" }, timeout);
}

export async function getMovieVideos(movieId, timeout = REQUEST_TIMEOUT_MS) {
  return tmdbFetch(`/movie/${movieId}/videos`, { language: "en-US" }, timeout);
}

export async function getMovieImages(movieId, timeout = REQUEST_TIMEOUT_MS) {
  return tmdbFetch(`/movie/${movieId}/images`, {}, timeout);
}

export function buildTmdbImageUrl(path, size = "w500") {
  if (!path) return null;
  const base =
    import.meta.env.VITE_TMDB_IMAGE_BASE_URL || TMDB_IMAGE_BASE || "https://image.tmdb.org/t/p";
  const normalizedBase = String(base).replace(/\/$/, "");
  const normalizedPath = String(path).startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}/${size}${normalizedPath}`;
}

export function getPosterUrl(path, size = POSTER_SIZE, imageBase = TMDB_IMAGE_BASE) {
  return buildTmdbImageUrl(path, size) || buildImageUrl(path, size, imageBase);
}

export function getBackdropUrl(path, size = BACKDROP_SIZE, imageBase = TMDB_IMAGE_BASE) {
  return buildTmdbImageUrl(path, size) || buildImageUrl(path, size, imageBase);
}

export async function fetchRecommendationsFromTmdb(movieId, timeout = REQUEST_TIMEOUT_MS) {
  try {
    const recommendations = await tmdbFetch(
      `/movie/${movieId}/recommendations`,
      { language: "en-US", page: 1 },
      timeout
    );
    const results = Array.isArray(recommendations?.results)
      ? recommendations.results
      : [];
    return results.map((item) => ({
      id: item.id,
      score: item.vote_average ? item.vote_average / 10 : null,
    }));
  } catch (error) {
    console.error("[CineScope] TMDb recommendations fetch failed:", error);
    return [];
  }
}

export async function fetchSimilarFromTmdb(movieId, timeout = REQUEST_TIMEOUT_MS) {
  try {
    const similar = await tmdbFetch(
      `/movie/${movieId}/similar`,
      { language: "en-US", page: 1 },
      timeout
    );
    const results = Array.isArray(similar?.results) ? similar.results : [];
    return results.map((item) => ({
      id: item.id,
      score: item.vote_average ? item.vote_average / 10 : null,
    }));
  } catch (error) {
    console.error("[CineScope] TMDb similar fetch failed:", error);
    return [];
  }
}

export async function fetchTrendingMovies(timeout = REQUEST_TIMEOUT_MS) {
  const data = await tmdbFetch("/trending/movie/week", { language: "en-US" }, timeout);
  return Array.isArray(data?.results) ? data.results : [];
}

/**
 * Busca filme por título/ano para enriquecimento quando dados do modelo estão incompletos.
 * Estratégia: filtrar por ano se disponível; senão ordenar por popularity/vote_count.
 */
export async function searchMovieByTitleYear(title, year = null, timeout = REQUEST_TIMEOUT_MS) {
  if (!title?.trim()) return null;

  const params = {
    query: title.trim(),
    include_adult: false,
    language: "en-US",
    page: 1,
  };
  if (year) params.year = year;

  const data = await tmdbFetch("/search/movie", params, timeout);
  const results = Array.isArray(data?.results) ? data.results : [];
  if (!results.length) return null;

  if (year) {
    const yearMatch = results.find((m) => {
      const releaseYear = m.release_date
        ? new Date(m.release_date).getFullYear()
        : null;
      return releaseYear === year;
    });
    if (yearMatch) return yearMatch;
  }

  return results.sort((a, b) => {
    const popDiff = (b.popularity ?? 0) - (a.popularity ?? 0);
    if (popDiff !== 0) return popDiff;
    return (b.vote_count ?? 0) - (a.vote_count ?? 0);
  })[0];
}

export async function getMovieBasicDetails(movieId, timeout = REQUEST_TIMEOUT_MS) {
  return tmdbFetch(`/movie/${movieId}`, { language: "en-US" }, timeout);
}
