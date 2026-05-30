import {
  hasTmdbCredentials,
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  fetchRecommendationsFromTmdb,
  fetchSimilarFromTmdb,
  searchMovie,
} from "./tmdbApi.js";
import {
  REQUEST_TIMEOUT_MS,
  SEMANTIC_MERGE_TOP,
  TMDB_COMPLEMENT_TOP,
  TOP_N_DISPLAY,
} from "../config/constants.js";
import { mergeModelAndTmdbMovies } from "./mergeRecommendations.js";
import {
  fetchRecommendations,
  fetchRecommendationsBySynopsis,
  buildRecommendationPayloadFromMovie,
  isThematicQuery,
} from "./recommenderApi.js";
import { rankMovies, hasValidRating } from "./movieRanking.js";

function dedupeByMovieId(movies) {
  const seen = new Set();
  return movies.filter((movie) => {
    const id = movie.movieId ?? movie.tmdbId ?? movie.tmdb_id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function logPipelineCounts(label, counts) {
  if (!import.meta.env.DEV) return;
  console.log(`[CineScope] ${label}`, counts);
}
import {
  mapTmdbMovieToInternal,
  mapToRecommendationCard,
  normalizeTmdbMovie,
  mapEnrichedMovieToInternal,
  enrichedToRankableItem,
} from "../utils/movieMappers.js";
import { getPosterUrl, getBackdropUrl } from "../utils/movieFallbacks.js";
import { devLog } from "../utils/devLog.js";

const RECOMMENDER_FETCH_TOP_K = 20;

function collectExcludeIds(...values) {
  const exclude = new Set();
  for (const value of values) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const id of value) {
        if (id != null) exclude.add(id);
      }
    } else {
      exclude.add(value);
    }
  }
  return exclude;
}

/**
 * Para cada movie_id do modelo, busca detalhes ricos no TMDb.
 */
export async function enrichMoviesWithTmdb(movies, timeout = REQUEST_TIMEOUT_MS) {
  return Promise.all(
    movies.map(async (movie) => {
      if (!movie.movieId || !hasTmdbCredentials()) {
        return {
          ...movie,
          posterUrl: getPosterUrl(null),
          backdropUrl: getBackdropUrl(null),
          genres: [],
          cast: [],
          trailerUrl: null,
          hasValidRating: false,
        };
      }

      try {
        const [details, credits, videos] = await Promise.all([
          getMovieDetails(movie.movieId, "external_ids", timeout),
          getMovieCredits(movie.movieId, timeout).catch(() => null),
          getMovieVideos(movie.movieId, timeout).catch(() => null),
        ]);

        const enriched = normalizeTmdbMovie({ base: movie, details, credits, videos });
        enriched.hasValidRating = hasValidRating(
          enriched.voteAverage,
          enriched.voteCount
        );
        return enriched;
      } catch (error) {
        console.warn("[CineScope] TMDb enrichment failed", movie.movieId, error?.message);
        return {
          ...movie,
          title: movie.title || "Untitled",
          overview: movie.overview || "No synopsis available.",
          posterUrl: getPosterUrl(null),
          backdropUrl: getBackdropUrl(null),
          genres: movie.genres ?? [],
          cast: [],
          trailerUrl: null,
          hasValidRating: false,
          enrichmentStatus: "failed",
        };
      }
    })
  );
}

function mapRankedEnrichedToCards(rankedItems) {
  return rankedItems
    .map((item) => {
    const enriched = item._enriched ?? item;
    const movie = mapEnrichedMovieToInternal(enriched);

    if (!movie?.id && !movie?.tmdbId) return null;

    if (movie && Number.isFinite(item.similarity_score)) {
      movie.similarityScore = item.similarity_score;
      movie.semanticScore = item.similarity_score;
    }

    const score = Number.isFinite(item.finalScore)
      ? Math.min(1, item.finalScore)
      : Number.isFinite(item.similarity_score)
        ? Math.min(1, item.similarity_score)
        : null;

    return mapToRecommendationCard({
      movie,
      score,
      finalScore: item.finalScore,
      bertScore: item.bertScore,
      genreScore: item.genreScore,
      commonGenres: item.commonGenres,
      totalSourceGenres: item.totalSourceGenres,
      candidateGenres: item.candidateGenres,
    });
  })
    .filter(Boolean);
}

async function runSemanticPipeline(baseMovies, rankOptions, topN) {
  const dedupedBase = dedupeByMovieId(baseMovies);

  const enriched = await enrichMoviesWithTmdb(dedupedBase);
  devLog("[CineScope] enriched movies", enriched);

  const rankable = dedupeByMovieId(enriched).map(enrichedToRankableItem);
  const reranked = rankMovies(rankable, rankOptions);
  const cards = mapRankedEnrichedToCards(reranked.slice(0, topN));

  logPipelineCounts("recommendation pipeline counts", {
    rawCount: baseMovies.length,
    dedupedRawCount: dedupedBase.length,
    enrichedCount: enriched.length,
    rankableCount: rankable.length,
    rankedCount: reranked.length,
    renderedCount: cards.length,
  });

  devLog("[CineScope] ranked movies", reranked);
  devLog("[CineScope] rendered recommendations", cards);

  return cards;
}

/**
 * Complemento TMDb (recommendations + similar), enriquecido como cards.
 */
async function fetchTmdbComplementCards(anchorMovieId, excludeIds, limit = TMDB_COMPLEMENT_TOP) {
  if (!anchorMovieId || !hasTmdbCredentials()) return [];

  const [recommendations, similar] = await Promise.all([
    fetchRecommendationsFromTmdb(anchorMovieId),
    fetchSimilarFromTmdb(anchorMovieId),
  ]);

  const seen = new Set(excludeIds);
  const candidates = [];

  for (const item of [...recommendations, ...similar]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    candidates.push(item);
    if (candidates.length >= limit) break;
  }

  const details = await Promise.all(
    candidates.map(async (item) => {
      try {
        const movie = await getMovieDetails(
          item.id,
          "credits,videos,external_ids",
          REQUEST_TIMEOUT_MS
        );
        return { movie, score: item.score ?? null };
      } catch {
        return null;
      }
    })
  );

  return details
    .filter((entry) => entry?.movie)
    .map((entry) =>
      mapToRecommendationCard({
        movie: mapTmdbMovieToInternal(entry.movie, {
          source: "tmdb_fallback",
          recommendationSource: "tmdb_fallback",
        }),
        score: entry.score,
      })
    );
}

async function resolveTmdbAnchorId(movieId, movieDetails, semanticCards, synopsis) {
  if (movieId) return movieId;

  const firstSemanticId = semanticCards[0]?.movie?.id ?? semanticCards[0]?.movie?.tmdbId;
  if (firstSemanticId) return firstSemanticId;

  const query =
    movieDetails?.title ||
    movieDetails?.name ||
    (typeof synopsis === "string" ? synopsis.trim() : "");

  if (!query || query.length < 2) return null;

  try {
    const results = await searchMovie(query, { limit: 1 });
    return results[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function buildHybridRecommendations({
  baseMovies,
  rankOptions,
  anchorMovieId,
  movieDetails,
  synopsis,
}) {
  const semanticCards = await runSemanticPipeline(
    baseMovies,
    rankOptions,
    SEMANTIC_MERGE_TOP
  );

  const semanticIds = semanticCards.map((c) => c.movie?.id ?? c.movie?.tmdbId);
  const exclude = collectExcludeIds(anchorMovieId, semanticIds);

  const resolvedAnchor = await resolveTmdbAnchorId(
    anchorMovieId,
    movieDetails,
    semanticCards,
    synopsis
  );

  const tmdbCards = resolvedAnchor
    ? await fetchTmdbComplementCards(resolvedAnchor, exclude, TMDB_COMPLEMENT_TOP)
    : [];

  const recommendations = mergeModelAndTmdbMovies(semanticCards, tmdbCards);

  logPipelineCounts("hybrid recommendation counts", {
    semanticCount: semanticCards.length,
    tmdbComplementCount: tmdbCards.length,
    mergedCount: recommendations.length,
    anchorMovieId: resolvedAnchor,
  });

  return {
    recommendations,
    usedTmdbFallback: false,
    usedTmdbComplement: tmdbCards.length > 0,
  };
}

/**
 * Filme conhecido (TMDb) → recommender → enrich → rank.
 */
export async function processRecommendations(movieId, movieDetails, options = {}) {
  const { topN = TOP_N_DISPLAY } = options;
  const sourceGenresList =
    Array.isArray(movieDetails.genres) && movieDetails.genres.length > 0
      ? movieDetails.genres.map((g) => g.name)
      : [];

  let baseMovies = [];

  try {
    baseMovies = await fetchRecommendations(movieId, movieDetails, {
      topK: RECOMMENDER_FETCH_TOP_K,
    });
    logPipelineCounts("normalized recommendations (movie)", {
      normalizedCount: baseMovies.length,
      topK: RECOMMENDER_FETCH_TOP_K,
    });
    if (baseMovies.length === 0) {
      throw new Error("Recommender returned empty results");
    }
  } catch (error) {
    console.warn(
      `[CineScope] Recommender failed for "${movieDetails?.title || movieId}":`,
      error.message
    );
    return loadTmdbFallbackRecommendations(movieId, topN);
  }

  return buildHybridRecommendations({
    baseMovies,
    rankOptions: {
      sourceGenresList,
      overviewLength: (movieDetails.overview || "").trim().length,
    },
    anchorMovieId: movieId,
    movieDetails,
  });
}

/**
 * Texto livre / tema → recommender → enrich → rank.
 */
export async function processSynopsisQuery(synopsis, options = {}) {
  const baseMovies = await fetchRecommendationsBySynopsis(
    synopsis,
    RECOMMENDER_FETCH_TOP_K
  );

  logPipelineCounts("normalized recommendations (synopsis)", {
    normalizedCount: baseMovies.length,
    topK: RECOMMENDER_FETCH_TOP_K,
  });

  if (!baseMovies.length) {
    return { recommendations: [], usedTmdbFallback: false };
  }

  return buildHybridRecommendations({
    baseMovies,
    rankOptions: {
      sourceGenresList: [],
      overviewLength: synopsis.trim().length,
    },
    anchorMovieId: null,
    movieDetails: null,
    synopsis,
  });
}

export async function loadTmdbFallbackRecommendations(movieId, topN = TOP_N_DISPLAY) {
  if (!hasTmdbCredentials()) {
    return { recommendations: [], usedTmdbFallback: true, error: "No TMDb credentials" };
  }

  try {
    const tmdbRecommendations = await fetchRecommendationsFromTmdb(movieId);

    const details = await Promise.all(
      tmdbRecommendations
        .filter((item) => item.id && typeof item.id === "number")
        .slice(0, topN)
        .map(async (item) => {
          try {
            const movie = await getMovieDetails(
              item.id,
              "credits,videos,external_ids",
              REQUEST_TIMEOUT_MS
            );
            return { movie, score: item.score ?? null };
          } catch {
            return null;
          }
        })
    );

    const filtered = details.filter((entry) => entry && entry.movie);

    const sorted = filtered.sort((a, b) => {
      const ratingA = Number.isFinite(a.movie?.vote_average) ? a.movie.vote_average : 0;
      const ratingB = Number.isFinite(b.movie?.vote_average) ? b.movie.vote_average : 0;
      return ratingB - ratingA;
    });

    const recommendations = sorted.map((entry) =>
      mapToRecommendationCard({
        movie: mapTmdbMovieToInternal(entry.movie, {
          source: "tmdb_fallback",
          recommendationSource: "tmdb_fallback",
        }),
        score: entry.score,
      })
    );

    return { recommendations, usedTmdbFallback: true };
  } catch (error) {
    console.error("[CineScope] TMDb fallback also failed:", error);
    return { recommendations: [], usedTmdbFallback: true, error: error.message };
  }
}

export function normalizeSourceMovie(details) {
  return mapTmdbMovieToInternal(details, { source: "tmdb" });
}

/** @deprecated alias */
export const enrichSemanticRecommendation = enrichMoviesWithTmdb;

export { buildRecommendationPayloadFromMovie, isThematicQuery };
export { mergeModelAndTmdbMovies } from "./mergeRecommendations.js";
