import {
  formatTmdbScore,
  formatPercent,
  formatCompactNumber,
  getMovieYear,
} from "./formatters.js";

function resolveSemanticScore(movie, semanticScoreProp) {
  if (semanticScoreProp != null) return semanticScoreProp;
  return (
    movie?.semanticScore ??
    movie?.similarityScore ??
    movie?.matchScore ??
    null
  );
}

function parsePercentValue(formatted) {
  if (!formatted || formatted === "—") return null;
  return formatted.replace("%", "");
}

/**
 * Monta métricas do Spotlight apenas com dados reais disponíveis.
 */
export function buildSpotlightMetrics(movie, semanticScoreProp) {
  if (!movie) return [];

  const metrics = [];

  const tmdbScore = formatTmdbScore(movie.voteAverage ?? movie.vote_average);
  if (tmdbScore !== "—") {
    metrics.push({
      key: "tmdb",
      icon: "star",
      value: tmdbScore,
      suffix: "/10",
      label: "TMDb",
    });
  }

  const semanticFormatted = formatPercent(resolveSemanticScore(movie, semanticScoreProp));
  const semanticValue = parsePercentValue(semanticFormatted);
  if (semanticValue != null) {
    metrics.push({
      key: "semantic",
      icon: "semantic",
      value: semanticValue,
      suffix: "%",
      label: "Semantic",
    });
  }

  const popularity = formatCompactNumber(movie.popularity);
  if (popularity !== "—") {
    metrics.push({
      key: "popularity",
      icon: "popularity",
      value: popularity,
      label: "Popularity",
    });
  }

  const releaseYear = getMovieYear(movie);
  if (releaseYear !== "—") {
    metrics.push({
      key: "release",
      icon: "release",
      value: releaseYear,
      label: "Release",
    });
  }

  const tomatoMeter = movie.tomatoMeter ?? movie.rottenTomatoesScore;
  if (tomatoMeter != null && Number.isFinite(Number(tomatoMeter))) {
    metrics.splice(Math.min(2, metrics.length), 0, {
      key: "tomatometer",
      icon: "tomatometer",
      value: String(Math.round(Number(tomatoMeter))),
      suffix: "%",
      label: "Tomatometer",
    });
  }

  const awards = movie.oscarWins ?? movie.academyAwards ?? movie.awards;
  if (awards != null && awards !== "") {
    metrics.push({
      key: "awards",
      icon: "awards",
      value: String(awards),
      label: "Awards",
    });
  }

  return metrics;
}
