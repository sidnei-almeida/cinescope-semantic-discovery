import { buildYouTubeEmbedUrl } from "../utils/youtube.js";

export default function YouTubeTrailerEmbed({ videoKey, title = "YouTube trailer" }) {
  if (!videoKey) return null;

  const src = buildYouTubeEmbedUrl(videoKey);

  if (!src) return null;

  return (
    <div className="movie-trailer">
      <div className="movie-trailer__shell">
        <iframe
          src={src}
          title={title}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
