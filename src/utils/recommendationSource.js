const SEMANTIC_SOURCES = new Set([
  "semantic_model",
  "recommender",
  "recommender+tmdb",
]);

const TMDB_SOURCES = new Set(["tmdb_fallback", "tmdb-fallback"]);

export function normalizeRecommendationSource(source) {
  if (!source) return null;
  if (SEMANTIC_SOURCES.has(source)) return "semantic_model";
  if (TMDB_SOURCES.has(source)) return "tmdb_fallback";
  return null;
}

export function getSourceLabel(movie) {
  const source = normalizeRecommendationSource(
    movie?.recommendationSource || movie?.source
  );

  if (source === "semantic_model") return "semantic";
  if (source === "tmdb_fallback") return "tmdb";

  return null;
}

export function getSourceClass(movie) {
  const source = normalizeRecommendationSource(
    movie?.recommendationSource || movie?.source
  );

  if (source === "semantic_model") return "badge-semantic";
  if (source === "tmdb_fallback") return "badge-tmdb";

  return "";
}

export function attachRecommendationSource(movie, recommendationSource) {
  if (!movie) return null;

  return {
    ...movie,
    source: movie.source || recommendationSource,
    recommendationSource,
  };
}
