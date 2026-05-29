import clsx from "clsx";
import { formatMatchPercent } from "../utils/formatters.js";
import { getCardImageUrl } from "../utils/movieFallbacks.js";
import { getSourceClass, getSourceLabel } from "../utils/recommendationSource.js";

export default function MovieCard({ entry, active, onSelect }) {
  const { movie, score } = entry;
  const matchPercent = formatMatchPercent(score);
  const matchValue = Number.isFinite(score) ? Math.min(100, Math.round(score * 100)) : 0;
  const cardImage = getCardImageUrl(movie);
  const sourceLabel = getSourceLabel(movie);
  const sourceClass = getSourceClass(movie);

  const handleSelect = () => onSelect?.(entry);

  return (
    <article
      className={clsx("movie-card", active && "movie-card--active")}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        className="movie-card-image-button"
        onClick={(e) => {
          e.stopPropagation();
          handleSelect();
        }}
        aria-label={`View ${movie.title}`}
      >
        <img
          className="movie-card-image"
          src={cardImage}
          alt=""
          loading="lazy"
          aria-hidden
        />
      </button>

      <div className="movie-card-body">
        {sourceLabel && (
          <span className={clsx("movie-source-badge", sourceClass)}>
            {sourceLabel}
          </span>
        )}
        <h3>{movie.title}</h3>
        <p>{movie.year ?? "—"}</p>

        {matchPercent && (
          <>
            <div className="movie-card-match">
              <span className="match-dot" aria-hidden />
              <span>{matchValue}% Match</span>
            </div>
            <div className="match-bar" aria-label={`Match ${matchPercent}`}>
              <span style={{ width: `${matchValue}%` }} />
            </div>
          </>
        )}
      </div>
    </article>
  );
}
