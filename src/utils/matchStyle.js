/**
 * Normaliza score para fração 0–1 (API costuma enviar 0–1; aceita 0–100).
 */
export function normalizeMatchScore(score) {
  if (!Number.isFinite(score)) return null;
  if (score > 1 && score <= 100) return score / 100;
  if (score > 100) return 1;
  if (score < 0) return null;
  return score;
}

export function getMatchPercent(score) {
  const normalized = normalizeMatchScore(score);
  if (normalized == null) return null;
  return Math.min(100, Math.round(normalized * 100));
}

/**
 * Score exibido no card: similaridade semântica da API, não o finalScore do ranking híbrido.
 */
export function getDisplayMatchScore(entry) {
  if (!entry) return null;

  const { movie, score, bertScore } = entry;
  const source = movie?.recommendationSource || movie?.source;
  const isTmdbOnly = source === "tmdb_fallback" || source === "tmdb-fallback";

  const semantic =
    movie?.similarityScore ?? movie?.semanticScore ?? movie?.matchScore ?? null;

  if (Number.isFinite(semantic)) return normalizeMatchScore(semantic);
  if (!isTmdbOnly && Number.isFinite(bertScore)) return normalizeMatchScore(bertScore);
  if (!isTmdbOnly && Number.isFinite(score)) return normalizeMatchScore(score);

  return null;
}

/**
 * Estilo do match no card — barra e texto são independentes.
 * @returns {{
 *   percent: number | null;
 *   barWidthPercent: number;
 *   barVariant: 'high' | 'mid' | 'weak' | 'placeholder';
 *   textVariant: 'high' | 'mid' | 'weak' | null;
 *   showMatchText: boolean;
 * }}
 */
export function getMatchStyle(entry) {
  const normalized = getDisplayMatchScore(entry);
  const percent = getMatchPercent(normalized);

  if (percent == null) {
    return {
      percent: null,
      barWidthPercent: 100,
      barVariant: "placeholder",
      textVariant: null,
      showMatchText: false,
    };
  }

  if (percent >= 70) {
    return {
      percent,
      barWidthPercent: percent,
      barVariant: "high",
      textVariant: "high",
      showMatchText: true,
    };
  }

  if (percent >= 20) {
    return {
      percent,
      barWidthPercent: percent,
      barVariant: "mid",
      textVariant: "mid",
      showMatchText: true,
    };
  }

  return {
    percent,
    barWidthPercent: percent,
    barVariant: "weak",
    textVariant: "weak",
    showMatchText: true,
  };
}
