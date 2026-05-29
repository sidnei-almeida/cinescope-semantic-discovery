export function getYearFromDate(dateStr) {
  if (!dateStr) return null;
  const year = new Date(dateStr).getFullYear();
  return Number.isFinite(year) ? year : null;
}

export function formatDate(dateStr, locale = "en-US") {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRuntime(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

export function formatCurrency(value) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencySigned(value) {
  if (!Number.isFinite(value) || value === 0) return "—";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return value > 0 ? formatter.format(value) : `-${formatter.format(Math.abs(value))}`;
}

export function normalizeFinancialValue(value, counterpart) {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 1_000_000) return value;
  if (
    Number.isFinite(counterpart) &&
    counterpart > 10_000_000 &&
    value < counterpart * 0.2
  ) {
    return value * 1000;
  }
  return value;
}

export function formatList(values, limit = 3, fallback = "—") {
  if (!Array.isArray(values)) return fallback;
  const unique = [...new Set(values.filter(Boolean))];
  if (!unique.length) return fallback;
  const limited = unique.slice(0, limit);
  const suffix = unique.length > limit ? ` +${unique.length - limit}` : "";
  return `${limited.join(", ")}${suffix}`;
}

export function formatScore(score, decimals = 1) {
  if (!Number.isFinite(score)) return "—";
  return score.toFixed(decimals);
}

export function formatMatchPercent(score) {
  if (!Number.isFinite(score)) return null;
  return `${Math.min(100, Math.round(score * 100))}%`;
}

export function formatTmdbScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toFixed(1);
}

export function formatPercent(value) {
  if (value == null) return "—";

  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  if (number <= 1) return `${Math.round(number * 100)}%`;

  if (number <= 100) return `${Math.round(number)}%`;

  return `${Math.round(number)}%`;
}

export function formatCompactNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  if (number >= 1000) {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(number);
  }

  return String(Math.round(number));
}

export function getMovieYear(movie) {
  const date = movie?.releaseDate || movie?.release_date;
  if (date) return String(date).slice(0, 4);
  if (movie?.year != null) return String(movie.year);
  return "—";
}
