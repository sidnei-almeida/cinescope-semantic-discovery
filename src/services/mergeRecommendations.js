import { attachRecommendationSource } from "../utils/recommendationSource.js";
import {
  SEMANTIC_MERGE_TOP,
  TMDB_COMPLEMENT_TOP,
  TOP_N_DISPLAY,
} from "../config/constants.js";

function getMovieId(entry) {
  return entry?.movie?.id ?? entry?.movie?.tmdbId ?? null;
}

/**
 * Junta recomendações do modelo (prioridade) com complemento TMDb, sem duplicar IDs.
 */
export function mergeModelAndTmdbMovies(
  semanticCards = [],
  tmdbCards = [],
  options = {}
) {
  const {
    semanticLimit = SEMANTIC_MERGE_TOP,
    tmdbLimit = TMDB_COMPLEMENT_TOP,
    maxTotal = TOP_N_DISPLAY,
  } = options;

  const seen = new Set();
  const merged = [];

  for (const card of semanticCards.slice(0, semanticLimit)) {
    const id = getMovieId(card);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push({
      ...card,
      movie: attachRecommendationSource(
        {
          ...card.movie,
          source: card.movie?.source || "semantic_model",
        },
        "semantic_model"
      ),
    });
  }

  for (const card of tmdbCards.slice(0, tmdbLimit)) {
    const id = getMovieId(card);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push({
      ...card,
      movie: attachRecommendationSource(
        {
          ...card.movie,
          source: card.movie?.source || "tmdb_fallback",
        },
        "tmdb_fallback"
      ),
    });
  }

  if (import.meta.env.DEV) {
    const sourceCounts = merged.reduce((acc, entry) => {
      const key = entry.movie?.recommendationSource || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log("[CineScope] merged recommendation sources", {
      semanticInput: semanticCards.length,
      tmdbInput: tmdbCards.length,
      mergedTotal: merged.length,
      sourceCounts,
    });
  }

  return merged.slice(0, maxTotal);
}
