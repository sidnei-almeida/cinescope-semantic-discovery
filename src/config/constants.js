export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE =
  import.meta.env.VITE_TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";

export const POSTER_SIZE = "w500";
export const BACKDROP_SIZE = "w780";
export const THUMB_SIZE = "w185";
export const YOUTUBE_BASE_EMBED = "https://www.youtube.com/embed";

/**
 * API semântica em produção (FastAPI + BERT + Annoy no Render).
 * Este é o backend do portfólio — não foi removido nem substituído.
 */
export const SEMANTIC_MODEL_SERVICE_URL =
  "https://tmdb-semantic-recommender.onrender.com";

/** Caminho no browser; Vite/Vercel repassam para SEMANTIC_MODEL_SERVICE_URL (só evita CORS). */
export const RECOMMENDER_PROXY_PATH = "/recommender";

/**
 * Browser → /recommender → proxy → Render (SEMANTIC_MODEL_SERVICE_URL).
 * O modelo continua rodando no Render; o proxy é um túnel HTTP, não um fallback.
 */
function resolveRecommenderBaseUrl() {
  const envUrl = import.meta.env.VITE_RECOMMENDER_API_URL?.trim();
  const useDirect =
    import.meta.env.VITE_RECOMMENDER_DIRECT === "true" ||
    import.meta.env.VITE_RECOMMENDER_DIRECT === "1";

  if (useDirect && envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (
    !envUrl ||
    envUrl === RECOMMENDER_PROXY_PATH ||
    envUrl.includes("onrender.com")
  ) {
    return RECOMMENDER_PROXY_PATH;
  }

  return envUrl.replace(/\/$/, "");
}

export const RECOMMENDER_BASE_URL = resolveRecommenderBaseUrl();

export const REQUEST_TIMEOUT_MS = 14000;
export const LONG_REQUEST_TIMEOUT_MS = 22000;
/** Render free tier pode levar 20–50s no cold start; 8s causava fallback TMDb sempre. */
export const BERT_API_TIMEOUT_MS = 28000;
export const MAX_RECOMMENDATIONS = 50;
/** Cards exibidos na shelf (híbrido: até 10 semânticos + até 20 TMDb). */
export const SEMANTIC_MERGE_TOP = 10;
export const TMDB_COMPLEMENT_TOP = 20;
export const TOP_N_DISPLAY = 30;

/** Filme carregado automaticamente ao abrir o site. */
export const DEFAULT_SPOTLIGHT_QUERY = "Frankenstein";

/** Sinopses curtas: BERT pesa palavras genéricas ("island"); priorizamos metadados de gênero. */
export const SPARSE_OVERVIEW_MAX_CHARS = 380;

export const BERT_WEIGHT_DEFAULT = 0.32;
export const GENRE_WEIGHT_DEFAULT = 0.68;
export const BERT_WEIGHT_SPARSE = 0.18;
export const GENRE_WEIGHT_SPARSE = 0.82;
