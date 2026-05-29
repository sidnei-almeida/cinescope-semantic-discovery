import { normalizeRecommendationSource } from "./recommendationSource.js";

export function getNumeric(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getEntrySource(entry) {
  return normalizeRecommendationSource(
    entry?.movie?.recommendationSource || entry?.movie?.source
  );
}

export function filterRecommendations(entries, { titleFilter = "", sourceFilter = "all" }) {
  const query = titleFilter.trim().toLowerCase();

  return entries.filter((entry) => {
    const movie = entry?.movie;
    if (!movie) return false;

    const title = String(movie.title || movie.name || "").toLowerCase();
    const matchesTitle = !query || title.includes(query);

    const source = getEntrySource(entry);
    const matchesSource = sourceFilter === "all" || source === sourceFilter;

    return matchesTitle && matchesSource;
  });
}

export function sortRecommendations(entries, sortBy) {
  if (sortBy === "best_match") {
    return entries;
  }

  const sorted = [...entries];

  switch (sortBy) {
    case "newest":
      return sorted.sort(
        (a, b) => getNumeric(b.movie?.year) - getNumeric(a.movie?.year)
      );
    case "oldest":
      return sorted.sort(
        (a, b) => getNumeric(a.movie?.year) - getNumeric(b.movie?.year)
      );
    case "tmdb_score":
      return sorted.sort(
        (a, b) =>
          getNumeric(b.movie?.voteAverage) - getNumeric(a.movie?.voteAverage)
      );
    case "popularity":
      return sorted.sort(
        (a, b) =>
          getNumeric(b.movie?.popularity) - getNumeric(a.movie?.popularity)
      );
    default:
      return sorted;
  }
}
