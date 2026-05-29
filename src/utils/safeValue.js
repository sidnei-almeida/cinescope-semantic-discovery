/**
 * Evita NaN / "nan" / valores não finitos na UI.
 */
export function safeValue(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === "number" && !Number.isFinite(value)) return fallback;
  if (typeof value === "string" && value.toLowerCase() === "nan") return fallback;
  return value;
}
