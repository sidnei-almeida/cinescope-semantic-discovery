import { TMDB_IMAGE_BASE, POSTER_SIZE, BACKDROP_SIZE } from "../config/constants.js";

export const PLACEHOLDER_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3E%3Crect fill='%23171611' width='500' height='750'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236f675b' font-family='sans-serif' font-size='24'%3ENo Poster%3C/text%3E%3C/svg%3E";

export const PLACEHOLDER_BACKDROP =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='780' height='439' viewBox='0 0 780 439'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231d1b16'/%3E%3Cstop offset='100%25' stop-color='%23090706'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='780' height='439'/%3E%3C/svg%3E";

export const DEFAULT_OVERVIEW = "No synopsis available.";
export const UNKNOWN_YEAR = "Unknown year";

export function buildImageUrl(path, size = POSTER_SIZE, imageBase = TMDB_IMAGE_BASE) {
  if (!path) return null;
  return `${imageBase}/${size}${path}`;
}

export function getPosterUrl(movie, options = {}) {
  const { size = POSTER_SIZE, imageBase = TMDB_IMAGE_BASE } = options;
  const path = movie?.poster_path ?? movie?.posterPath;
  return buildImageUrl(path, size, imageBase) || PLACEHOLDER_POSTER;
}

export function getBackdropUrl(movie, options = {}) {
  const { size = BACKDROP_SIZE, imageBase = TMDB_IMAGE_BASE } = options;
  const path = movie?.backdrop_path ?? movie?.backdropPath;
  const posterPath = movie?.poster_path ?? movie?.posterPath;
  return (
    buildImageUrl(path, size, imageBase) ||
    buildImageUrl(posterPath, size, imageBase) ||
    PLACEHOLDER_BACKDROP
  );
}

/** Horizontal card image: backdrop first, poster as fallback. */
export function getCardImageUrl(movie, options = {}) {
  if (!movie) return PLACEHOLDER_BACKDROP;

  const { size = BACKDROP_SIZE, imageBase = TMDB_IMAGE_BASE } = options;
  const backdropPath = movie.backdrop_path ?? movie.backdropPath;

  return (
    movie.backdropUrl ||
    movie.backdrop_url ||
    movie.backdropPathUrl ||
    buildImageUrl(backdropPath, size, imageBase) ||
    movie.posterUrl ||
    movie.poster_url ||
    movie.imageUrl ||
    getBackdropUrl(movie, options)
  );
}

export function getOverviewFallback(overview) {
  if (overview && String(overview).trim().length > 0) {
    return String(overview).trim();
  }
  return DEFAULT_OVERVIEW;
}

export function getYearFallback(movie) {
  const date = movie?.release_date ?? movie?.releaseDate;
  if (date) {
    const year = new Date(date).getFullYear();
    if (Number.isFinite(year)) return year;
  }
  if (Number.isFinite(movie?.year)) return movie.year;
  return UNKNOWN_YEAR;
}

export function getGenresFallback(genres) {
  if (!Array.isArray(genres)) return [];
  return genres
    .map((g) => (typeof g === "string" ? g : g?.name))
    .filter(Boolean);
}

export function pickTrailerKey(videos) {
  if (!Array.isArray(videos) || !videos.length) return null;

  const acceptedTypes = new Set([
    "Trailer",
    "Teaser",
    "Clip",
    "Featurette",
    "Behind the Scenes",
  ]);
  const isTrailer = (video) =>
    video &&
    video.site === "YouTube" &&
    video.key &&
    acceptedTypes.has(video.type);

  const priorities = [
    (video) =>
      isTrailer(video) &&
      video.type === "Trailer" &&
      video.official === true &&
      video.iso_639_1 === "en",
    (video) =>
      isTrailer(video) && video.type === "Trailer" && video.iso_639_1 === "en",
    (video) => isTrailer(video) && video.iso_639_1 === "en",
    (video) => isTrailer(video),
  ];

  for (const predicate of priorities) {
    const match = videos.find(predicate);
    if (match?.key) return match.key;
  }

  const fallback = videos.find((video) => video.site === "YouTube" && video.key);
  return fallback?.key ?? null;
}
