import { getYearFromDate } from "./formatters.js";
import {
  getGenresFallback,
  getOverviewFallback,
  getPosterUrl,
  getBackdropUrl,
  pickTrailerKey,
} from "./movieFallbacks.js";
import { buildYouTubeEmbedUrl } from "./youtube.js";
import { buildTmdbImageUrl } from "../services/tmdbApi.js";
import { safeValue } from "./safeValue.js";
import { attachRecommendationSource } from "./recommendationSource.js";

/**
 * Resposta do modelo (array ou { recommendations: [] }).
 */
export function normalizeRecommenderResponse(response) {
  const items = Array.isArray(response)
    ? response
    : Array.isArray(response?.recommendations)
      ? response.recommendations
      : [];

  return items
    .map((item) => {
      const rawId =
        item.movie_id ?? item.movieId ?? item.tmdb_id ?? item.tmdbId ?? item.id;
      const movieId =
        typeof rawId === "string" && /^\d+$/.test(rawId.trim())
          ? Number(rawId.trim())
          : safeValue(rawId);

      return {
      movieId,
      title: safeValue(item.title, "") || "",
      overview: safeValue(item.overview, "") || "",
      similarityScore: safeValue(
        item.similarity_score ??
          item.similarityScore ??
          item.score ??
          item.matchScore,
        null
      ),
      raw: item,
    };
    })
    .filter((movie) => movie.movieId != null && movie.movieId !== "");
}

/**
 * Enriquecimento TMDb após o modelo (details + credits + videos).
 */
export function normalizeTmdbMovie({ base, details, credits, videos }) {
  const cast = Array.isArray(credits?.cast)
    ? credits.cast.slice(0, 8).map((person) => ({
        id: person.id,
        name: person.name,
        character: person.character,
        profilePath: safeValue(person.profile_path),
        profileUrl: buildTmdbImageUrl(person.profile_path, "w185"),
      }))
    : [];

  const trailer = Array.isArray(videos?.results)
    ? videos.results.find(
        (video) => video.site === "YouTube" && video.type === "Trailer"
      ) || videos.results.find((video) => video.site === "YouTube")
    : null;

  const posterPath = safeValue(details?.poster_path);
  const backdropPath = safeValue(details?.backdrop_path);
  const releaseDate = safeValue(details?.release_date);

  return {
    ...base,
    movieId: safeValue(details?.id, base.movieId) ?? base.movieId,
    tmdbId: safeValue(details?.id, base.movieId) ?? base.movieId,
    title: safeValue(details?.title, base.title) || base.title || "Untitled",
    overview: getOverviewFallback(details?.overview || base.overview),
    releaseDate,
    year: releaseDate ? String(releaseDate).slice(0, 4) : null,
    runtime: safeValue(details?.runtime),
    genres: Array.isArray(details?.genres)
      ? details.genres.map((genre) => genre.name).filter(Boolean)
      : [],
    voteAverage: safeValue(details?.vote_average),
    voteCount: safeValue(details?.vote_count, 0),
    popularity: safeValue(details?.popularity),
    posterPath,
    backdropPath,
    posterUrl: buildTmdbImageUrl(posterPath, "w500") || getPosterUrl({ poster_path: posterPath }),
    backdropUrl:
      buildTmdbImageUrl(backdropPath, "w1280") || getBackdropUrl({ backdrop_path: backdropPath }),
    cast,
    trailer,
    trailerKey: trailer?.key ?? null,
    trailerUrl: trailer?.key ? buildYouTubeEmbedUrl(trailer.key) : null,
    similarityScore: base.similarityScore,
    raw: base.raw,
  };
}

/** Converte filme enriquecido para formato interno da UI. */
export function mapEnrichedMovieToInternal(enriched, options = {}) {
  if (!enriched) return null;

  const movieId = enriched.movieId ?? enriched.tmdbId;

  return attachRecommendationSource({
    id: movieId,
    tmdbId: movieId,
    title: enriched.title ?? "Untitled",
    originalTitle: enriched.title,
    year: enriched.year ? Number(enriched.year) : null,
    releaseDate: enriched.releaseDate,
    overview: enriched.overview ?? "",
    posterPath: enriched.posterPath,
    posterUrl: enriched.posterUrl || getPosterUrl(enriched),
    backdropPath: enriched.backdropPath,
    backdropUrl: enriched.backdropUrl || getBackdropUrl(enriched),
    genres: enriched.genres ?? [],
    runtime: enriched.runtime,
    voteAverage: enriched.voteAverage,
    voteCount: enriched.voteCount ?? 0,
    popularity: enriched.popularity,
    cast: enriched.cast ?? [],
    leadCast: (enriched.cast ?? []).map((c) => c.name).filter(Boolean),
    trailerKey: enriched.trailerKey ?? enriched.trailer?.key ?? null,
    trailerUrl: enriched.trailerUrl,
    semanticScore: enriched.similarityScore,
    similarityScore: enriched.similarityScore,
    matchScore: enriched.similarityScore,
    raw: enriched,
  }, "semantic_model");
}

/** Item para rankMovies (campos snake_case esperados pelo ranking). */
export function enrichedToRankableItem(enriched) {
  return {
    tmdb_id: enriched.movieId,
    movie_id: enriched.movieId,
    title: enriched.title,
    overview: enriched.overview,
    poster_path: enriched.posterPath,
    backdrop_path: enriched.backdropPath,
    release_date: enriched.releaseDate,
    year: enriched.year ? Number(enriched.year) : null,
    genres_list: enriched.genres ?? [],
    genres: (enriched.genres ?? []).map((name) => ({ name })),
    vote_average: enriched.voteAverage,
    vote_count: enriched.voteCount ?? 0,
    runtime: enriched.runtime,
    similarity_score: enriched.similarityScore,
    hasValidRating: enriched.hasValidRating ?? false,
    _enriched: enriched,
  };
}

/**
 * Mapeia retorno semântico básico (antes do enrich TMDb).
 * API: { movie_id, similarity_score, title, overview }
 */
export function mapRecommenderResultToInternal(item) {
  if (!item) return null;

  const tmdbId = item.movie_id ?? item.tmdb_id ?? item.tmdbId ?? item.id;
  const genres = getGenresFallback(item.genres_list ?? item.genres);

  return {
    id: tmdbId,
    tmdbId,
    title: item.title ?? "Untitled",
    originalTitle: item.original_title ?? item.originalTitle ?? item.title,
    year: item.year ?? null,
    releaseDate: item.year ? `${item.year}-01-01` : null,
    overview: item.overview ?? "",
    posterPath: item.poster_path ?? item.posterPath ?? null,
    posterUrl: getPosterUrl(item),
    backdropPath: item.backdrop_path ?? item.backdropPath ?? null,
    backdropUrl: getBackdropUrl(item),
    genres,
    runtime: item.runtime ?? null,
    voteAverage: item.vote_average ?? item.voteAverage ?? null,
    voteCount: item.vote_count ?? item.voteCount ?? 0,
    popularity: item.popularity ?? null,
    semanticScore: item.semantic_score ?? item.semanticScore ?? null,
    similarityScore: item.similarity_score ?? item.similarityScore ?? null,
    matchScore: item.match_score ?? item.matchScore ?? null,
    rankingScore: item.finalScore ?? item.rankingScore ?? null,
    imdbId:
      item.imdb_id ??
      item.imdbId ??
      item.external_ids?.imdb_id ??
      null,
    source: "recommender",
    raw: item,
  };
}

/**
 * Mapeia resposta completa do TMDb para formato interno unificado.
 */
export function mapTmdbMovieToInternal(details, options = {}) {
  if (!details) return null;

  const { source = "tmdb", recommendationSource } = options;
  const resolvedRecommendationSource =
    recommendationSource ??
    (source === "tmdb-fallback" || source === "tmdb_fallback"
      ? "tmdb_fallback"
      : undefined);
  const genres = getGenresFallback(details.genres);
  const crew = Array.isArray(details.credits?.crew) ? details.credits.crew : [];
  const cast = (details.credits?.cast ?? [])
    .filter((member) => typeof member.order === "number")
    .sort((a, b) => a.order - b.order)
    .slice(0, 10)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      order: member.order,
      profilePath: member.profile_path,
    }));

  const directors = crew
    .filter((member) => member.job === "Director")
    .map((member) => member.name);

  const writerJobs = new Set([
    "Screenplay",
    "Writer",
    "Story",
    "Author",
    "Teleplay",
    "Novel",
  ]);
  const writers = crew
    .filter((member) => writerJobs.has(member.job))
    .map((member) => member.name);

  const leadCast = (details.credits?.cast ?? [])
    .filter((member) => typeof member.order === "number")
    .sort((a, b) => a.order - b.order)
    .map((member) => member.name);

  const trailerKey = pickTrailerKey(details.videos?.results);
  const releaseDate = details.release_date ?? details.first_air_date ?? null;

  const mapped = {
    id: details.id,
    tmdbId: details.id,
    title: details.title ?? details.name ?? "Untitled",
    originalTitle: details.original_title ?? details.original_name ?? null,
    year: getYearFromDate(releaseDate),
    releaseDate,
    overview: getOverviewFallback(details.overview),
    posterPath: safeValue(details.poster_path),
    posterUrl: getPosterUrl(details),
    backdropPath: safeValue(details.backdrop_path),
    backdropUrl: getBackdropUrl(details),
    genres,
    runtime: Number.isFinite(details.runtime) ? details.runtime : null,
    voteAverage: Number.isFinite(details.vote_average) ? details.vote_average : null,
    voteCount: Number.isFinite(details.vote_count) ? details.vote_count : 0,
    popularity: Number.isFinite(details.popularity) ? details.popularity : null,
    budget: details.budget ?? null,
    revenue: details.revenue ?? null,
    productionCompanies: (details.production_companies ?? []).map((c) => c.name),
    productionCountries: (details.production_countries ?? []).map((c) => c.name),
    spokenLanguages: (details.spoken_languages ?? []).map(
      (lang) => lang.english_name || lang.name
    ),
    tagline: details.tagline ?? null,
    cast,
    leadCast,
    director: directors[0] ?? null,
    directors,
    writers,
    trailerKey: trailerKey ?? null,
    trailerUrl: trailerKey ? buildYouTubeEmbedUrl(trailerKey) : null,
    keywords: (details.keywords?.keywords ?? []).map((kw) => kw.name),
    imdbId:
      details.external_ids?.imdb_id ??
      details.imdb_id ??
      null,
    semanticScore: null,
    similarityScore: null,
    matchScore: null,
    rankingScore: null,
    source,
    raw: details,
  };

  if (resolvedRecommendationSource) {
    return attachRecommendationSource(mapped, resolvedRecommendationSource);
  }

  return mapped;
}

/**
 * Converte item enriquecido + scores para formato de card na UI.
 */
export function mapToRecommendationCard(item) {
  const movie = item.movie ?? item;
  const score = item.score ?? item.rankingScore ?? item.finalScore ?? null;

  return {
    movie: typeof movie.id !== "undefined" ? movie : mapTmdbMovieToInternal(movie),
    score: Number.isFinite(score) ? Math.min(1, score) : null,
    finalScore: item.finalScore ?? item.rankingScore ?? null,
    bertScore: item.bertScore ?? null,
    genreScore: item.genreScore ?? null,
    commonGenres: item.commonGenres ?? null,
    totalSourceGenres: item.totalSourceGenres ?? null,
    candidateGenres: item.candidateGenres ?? null,
  };
}
