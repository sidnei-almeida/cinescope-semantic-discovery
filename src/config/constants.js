export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE =
  import.meta.env.VITE_TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

export const POSTER_SIZE = "w500";
export const BACKDROP_SIZE = "w780";
export const THUMB_SIZE = "w185";
export const YOUTUBE_BASE_EMBED = "https://www.youtube.com/embed";

/**
 * Semantic engine. It now runs as a Python serverless function in this same
 * Vercel project (see api/index.py), so the browser calls a same-origin path —
 * no proxy, no CORS, no cold-start wake-up dance.
 *
 * VITE_RECOMMENDER_API_URL only exists as an escape hatch for pointing a local
 * dev build at a remote deployment.
 */
export const RECOMMENDER_BASE_URL =
  import.meta.env.VITE_RECOMMENDER_API_URL?.trim().replace(/\/$/, "") || "";

export const RECOMMEND_ENDPOINT = `${RECOMMENDER_BASE_URL}/api/v1/recommend`;
export const HEALTH_ENDPOINT = `${RECOMMENDER_BASE_URL}/api/health`;

export const REQUEST_TIMEOUT_MS = 14000;
export const LONG_REQUEST_TIMEOUT_MS = 22000;
/** Serverless: ~40ms warm, a few seconds on a cold instance. */
export const RECOMMENDER_TIMEOUT_MS = 12000;
export const MAX_RECOMMENDATIONS = 50;
/** Cards exibidos na shelf (híbrido: até 20 semânticos + até 20 TMDb). */
export const SEMANTIC_MERGE_TOP = 20;
export const TMDB_COMPLEMENT_TOP = 20;
export const TOP_N_DISPLAY = 40;

/** Filme carregado automaticamente ao abrir o site. */
export const DEFAULT_SPOTLIGHT_QUERY = "Frankenstein";

/** Sinopses curtas: BERT pesa palavras genéricas ("island"); priorizamos metadados de gênero. */
export const SPARSE_OVERVIEW_MAX_CHARS = 380;

export const BERT_WEIGHT_DEFAULT = 0.32;
export const GENRE_WEIGHT_DEFAULT = 0.68;
export const BERT_WEIGHT_SPARSE = 0.18;
export const GENRE_WEIGHT_SPARSE = 0.82;
