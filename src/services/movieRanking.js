import {
  SPARSE_OVERVIEW_MAX_CHARS,
  BERT_WEIGHT_DEFAULT,
  GENRE_WEIGHT_DEFAULT,
  BERT_WEIGHT_SPARSE,
  GENRE_WEIGHT_SPARSE,
} from "../config/constants.js";

/**
 * Normaliza nomes de gênero para comparação.
 */
export function normalizeGenreName(g) {
  if (typeof g === "string") return g.toLowerCase().trim();
  return (g.name || String(g)).toLowerCase().trim();
}

/**
 * Jaccard similarity entre conjuntos de gêneros: |A∩B| / |A∪B|
 * Evita favorecer blockbusters que só compartilham 1–2 gêneros genéricos com o filme fonte.
 */
export function calculateGenreScoreJaccard(sourceGenres, candidateGenres) {
  if (!Array.isArray(sourceGenres) || sourceGenres.length === 0) return 0;
  if (!Array.isArray(candidateGenres) || candidateGenres.length === 0) return 0;

  const sourceSet = new Set(
    sourceGenres.map(normalizeGenreName).filter((g) => g.length > 0)
  );
  const candSet = new Set(
    candidateGenres.map(normalizeGenreName).filter((g) => g.length > 0)
  );
  if (sourceSet.size === 0 || candSet.size === 0) return 0;

  let intersection = 0;
  for (const g of sourceSet) {
    if (candSet.has(g)) intersection++;
  }
  const union = sourceSet.size + candSet.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Penalidade quando o tom do candidato não combina (ex.: Family/Animation vs Horror psicológico).
 * Retorna multiplicador em (0, 1].
 */
export function toneMismatchMultiplier(sourceGenres, candidateGenres) {
  const s = new Set((sourceGenres || []).map(normalizeGenreName).filter(Boolean));
  const c = new Set((candidateGenres || []).map(normalizeGenreName).filter(Boolean));

  const sourceDark = s.has("horror") || s.has("thriller") || s.has("mystery");
  const sourceLight = s.has("family") || s.has("animation") || s.has("comedy");

  const candDark = c.has("horror") || c.has("thriller") || c.has("mystery");
  const candLightOnly =
    !candDark &&
    (c.has("family") || c.has("animation") || (c.has("comedy") && !c.has("horror")));

  if (sourceDark && !sourceLight && candLightOnly) return 0.28;
  if (sourceDark && c.has("romance") && !candDark) return 0.35;

  return 1;
}

/**
 * Penaliza candidatos com gêneros de blockbuster (Adventure, Comedy) quando o filme fonte não os tem.
 */
export function blockbusterGenreLeakPenalty(sourceGenres, candidateGenres) {
  const s = new Set((sourceGenres || []).map(normalizeGenreName).filter(Boolean));
  const c = new Set((candidateGenres || []).map(normalizeGenreName).filter(Boolean));
  let m = 1;
  if (!s.has("adventure") && c.has("adventure")) m *= 0.58;
  if (!s.has("comedy") && c.has("comedy")) m *= 0.52;
  if (!s.has("family") && c.has("family")) m *= 0.42;
  if (!s.has("animation") && c.has("animation")) m *= 0.45;
  return m;
}

export function calculateCommonGenresCount(sourceGenres, candidateGenres) {
  if (!Array.isArray(sourceGenres) || sourceGenres.length === 0) return 0;
  if (!Array.isArray(candidateGenres) || candidateGenres.length === 0) return 0;

  const sourceGenreNames = new Set(
    sourceGenres.map(normalizeGenreName).filter((g) => g.length > 0)
  );
  const candidateGenreNames = new Set(
    candidateGenres.map(normalizeGenreName).filter((g) => g.length > 0)
  );

  let intersection = 0;
  for (const genre of sourceGenreNames) {
    if (candidateGenreNames.has(genre)) intersection++;
  }
  return intersection;
}

/**
 * Quality gate TMDb em camadas (preservado do projeto antigo):
 * - 1000+ votes, ou
 * - 450+ votes com rating >= 6.2, ou
 * - 280+ votes com rating >= 6.5
 */
export function hasValidRating(voteAverage, voteCount) {
  if (voteAverage === null || voteAverage <= 0) return false;
  return (
    voteCount >= 1000 ||
    (voteCount >= 450 && voteAverage >= 6.2) ||
    (voteCount >= 280 && voteAverage >= 6.5)
  );
}

/**
 * Calcula score final de um filme candidato.
 *
 * Fatores:
 * - bertScore: proxy de similaridade semântica pela posição na lista da API (0.92 → 0.48)
 * - genreScore: Jaccard entre gêneros fonte/candidato
 * - Pesos: sinopse curta (<=380 chars) favorece gênero (82%) vs BERT (18%)
 * - Multiplicadores: toneMismatch, blockbusterGenreLeak
 * - Boosts: dark genre overlap (+6%), genre count match (+15% a +22% ou penalidade -38%)
 */
export function calculateMovieRank(movie, context = {}) {
  const {
    index = 0,
    total = 1,
    sourceGenresList = [],
    overviewLength = 9999,
  } = context;

  const sparse = Number(overviewLength) <= SPARSE_OVERVIEW_MAX_CHARS;
  const bertW = sparse ? BERT_WEIGHT_SPARSE : BERT_WEIGHT_DEFAULT;
  const genreW = sparse ? GENRE_WEIGHT_SPARSE : GENRE_WEIGHT_DEFAULT;

  const maxBertScore = 0.92;
  const minBertScore = 0.48;
  const bertScoreRange = maxBertScore - minBertScore;
  const n = Math.max(total, 1);
  const positionRatio = n <= 1 ? 0 : index / (n - 1);
  const apiSimilarity =
    movie.similarity_score ?? movie.similarityScore ?? movie.semantic_score;
  const bertScore = Number.isFinite(apiSimilarity)
    ? Math.max(minBertScore, Math.min(maxBertScore, apiSimilarity))
    : maxBertScore - positionRatio * bertScoreRange;

  const candidateGenres = Array.isArray(movie.genres_list)
    ? movie.genres_list
    : Array.isArray(movie.genres)
      ? movie.genres.map((g) => g.name || g)
      : [];

  const sourceNames = sourceGenresList.map((g) =>
    typeof g === "string" ? g : g.name || g
  );
  const totalSourceGenres = sourceNames.length;
  const candGenreSet = new Set(candidateGenres.map(normalizeGenreName).filter(Boolean));

  const genreScore = calculateGenreScoreJaccard(sourceNames, candidateGenres);
  let finalScore = bertW * bertScore + genreW * genreScore;

  const commonGenres = calculateCommonGenresCount(sourceNames, candidateGenres);
  const toneMul = toneMismatchMultiplier(sourceNames, candidateGenres);
  const leakMul = blockbusterGenreLeakPenalty(sourceNames, candidateGenres);
  finalScore *= toneMul * leakMul;

  const srcNorm = sourceNames.map(normalizeGenreName);
  const hasDark = srcNorm.some((g) => ["horror", "thriller", "mystery"].includes(g));
  if (
    hasDark &&
    (candGenreSet.has("thriller") || candGenreSet.has("mystery") || candGenreSet.has("horror"))
  ) {
    finalScore *= 1.06;
  }

  if (totalSourceGenres >= 3) {
    if (commonGenres === totalSourceGenres) finalScore *= 1.22;
    else if (commonGenres === totalSourceGenres - 1) finalScore *= 1.02;
    else if (commonGenres <= totalSourceGenres - 2) finalScore *= 0.62;
  } else if (totalSourceGenres === 2) {
    if (commonGenres === 2) finalScore *= 1.15;
    else if (commonGenres === 1) finalScore *= 0.72;
  }

  return {
    finalScore,
    bertScore,
    genreScore,
    commonGenres,
    totalSourceGenres,
    candidateGenres: candidateGenres.join(", ") || "",
    hybridSparse: sparse,
  };
}

/**
 * Re-ranking híbrido preservado do projeto antigo.
 * Ordenação: finalScore desc; empate resolvido por vote_average desc.
 */
export function rankMovies(recommendations, options = {}) {
  const { sourceGenresList = [], overviewLength = 9999 } = options;

  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return recommendations;
  }

  if (!Array.isArray(sourceGenresList) || sourceGenresList.length === 0) {
    return recommendations
      .map((item, index) => {
        const n = Math.max(recommendations.length, 1);
        const bertScore = 0.92 - (index / n) * 0.42;
        return {
          ...item,
          finalScore: bertScore,
          bertScore,
          genreScore: 0,
          commonGenres: 0,
          totalSourceGenres: 0,
          candidateGenres: "",
        };
      })
      .sort((a, b) => {
        if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore;
        return (b.vote_average ?? 0) - (a.vote_average ?? 0);
      });
  }

  const reranked = recommendations.map((item, index) => ({
    ...item,
    ...calculateMovieRank(item, {
      index,
      total: recommendations.length,
      sourceGenresList,
      overviewLength,
    }),
  }));

  reranked.sort((a, b) => {
    if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore;
    const ratingA = Number.isFinite(a.vote_average) ? a.vote_average : 0;
    const ratingB = Number.isFinite(b.vote_average) ? b.vote_average : 0;
    return ratingB - ratingA;
  });

  return reranked;
}

/** Alias para compatibilidade com nome do projeto antigo. */
export const hybridRerank = rankMovies;
