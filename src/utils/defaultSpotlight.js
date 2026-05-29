import { hasTmdbCredentials, searchMovie } from "../services/tmdbApi.js";
import { DEFAULT_SPOTLIGHT_QUERY } from "../config/constants.js";

function pickBestFrankenstein(results) {
  if (!Array.isArray(results) || results.length === 0) return null;

  const matches = results.filter((movie) =>
    (movie.title || movie.name || "").toLowerCase().includes("frankenstein")
  );

  const pool = matches.length > 0 ? matches : results;

  return (
    pool.sort((a, b) => {
      const yearA = a.release_date ? new Date(a.release_date).getFullYear() : 0;
      const yearB = b.release_date ? new Date(b.release_date).getFullYear() : 0;
      return yearB - yearA;
    })[0] ?? null
  );
}

/**
 * Filme inicial ao abrir o site — Frankenstein (prioriza 2025, senão o mais recente).
 */
export async function resolveDefaultSpotlightMovie() {
  if (!hasTmdbCredentials()) return null;

  const attempts = [
    { query: DEFAULT_SPOTLIGHT_QUERY, year: 2025 },
    { query: DEFAULT_SPOTLIGHT_QUERY },
  ];

  for (const { query, year } of attempts) {
    try {
      const results = await searchMovie(query, { limit: 10, year });
      const best = pickBestFrankenstein(results);
      if (best?.id) {
        const releaseYear = best.release_date
          ? new Date(best.release_date).getFullYear()
          : null;
        const title = best.title || best.name || query;
        return {
          id: best.id,
          title,
          displayTitle: releaseYear ? `${title} (${releaseYear})` : title,
        };
      }
    } catch (error) {
      console.warn("[CineScope] default spotlight lookup failed:", error?.message);
    }
  }

  return null;
}
