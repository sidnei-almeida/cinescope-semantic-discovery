import { YOUTUBE_BASE_EMBED } from "../config/constants.js";

/**
 * Build a YouTube embed URL with origin (required for Error 153 fix in some deployments).
 */
export function buildYouTubeEmbedUrl(videoKey, options = {}) {
  if (!videoKey) return null;

  const params = new URLSearchParams({
    autoplay: options.autoplay ? "1" : "0",
    rel: "0",
  });

  if (typeof window !== "undefined" && window.location?.origin) {
    params.set("origin", window.location.origin);
  }

  return `${YOUTUBE_BASE_EMBED}/${encodeURIComponent(videoKey)}?${params.toString()}`;
}

export function buildYouTubeWatchUrl(videoKey) {
  if (!videoKey) return null;
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoKey)}`;
}

export function extractYouTubeKey(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed, "https://www.youtube.com");
    if (url.hostname.includes("youtu.be")) {
      const key = url.pathname.replace(/^\//, "").split("/")[0];
      return key || null;
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] ?? null;
      }
      return url.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveTrailerKey(movie) {
  if (!movie) return null;
  return (
    movie.trailerKey ??
    movie.trailer?.key ??
    extractYouTubeKey(movie.trailerUrl)
  );
}
