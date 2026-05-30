import clsx from "clsx";
import { getDisplayMatchScore, getMatchStyle } from "../utils/matchStyle.js";
import { getCardImageUrl } from "../utils/movieFallbacks.js";
import {
  getSourceClass,
  getSourceLabel,
  normalizeRecommendationSource,
} from "../utils/recommendationSource.js";

export default function MovieCard({ entry, active, onSelect }) {
  const { movie } = entry;
  const recSource = normalizeRecommendationSource(
    movie?.recommendationSource || movie?.source
  );
  const similarityScore = getDisplayMatchScore(entry);
  const hasSemanticScore = similarityScore != null;
  const voteAverage = Number(movie?.voteAverage ?? movie?.vote_average);
  const hasTmdbRating = Number.isFinite(voteAverage) && voteAverage > 0;
  const tmdbBarPercent = hasTmdbRating
    ? Math.min(100, (voteAverage / 10) * 100)
    : 0;
  const tmdbRatingDisplay = hasTmdbRating ? voteAverage.toFixed(1) : null;

  const { percent, barWidthPercent, barVariant, textVariant, showMatchText } =
    getMatchStyle(entry);
  const cardImage = getCardImageUrl(movie);
  const sourceLabel = getSourceLabel(movie);
  const sourceClass = getSourceClass(movie);

  const handleSelect = () => onSelect?.(entry);

  const barLabel =
    percent != null ? `Match ${percent}%` : "Match score unavailable";

  const showSemanticFooter = recSource === "semantic_model" && hasSemanticScore;
  const showTmdbFooter = recSource === "tmdb_fallback" && hasTmdbRating;

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

        <div className="movie-card-meta">
          <h3>{movie.title}</h3>
          <p className="movie-card-year">{movie.year ?? "—"}</p>

          <div className="movie-card-footer">
            {showSemanticFooter && (
              <>
                {showMatchText && (
                  <div
                    className={clsx(
                      "movie-card-match",
                      textVariant === "high" && "movie-card-match--high",
                      textVariant === "mid" && "movie-card-match--mid",
                      textVariant === "weak" && "movie-card-match--weak"
                    )}
                  >
                    <span
                      className={clsx(
                        "match-dot",
                        textVariant === "high" && "match-dot--high",
                        textVariant === "mid" && "match-dot--mid",
                        textVariant === "weak" && "match-dot--weak"
                      )}
                      aria-hidden
                    />
                    <span>{percent}% Match</span>
                  </div>
                )}

                <div
                  className={clsx("match-bar", `match-bar--${barVariant}`)}
                  aria-label={barLabel}
                >
                  <span style={{ width: `${barWidthPercent}%` }} />
                </div>
              </>
            )}

            {showTmdbFooter && (
              <>
                <div
                  className="movie-card-tmdb-rating"
                  aria-label={`TMDb rating ${tmdbRatingDisplay} out of 10`}
                >
                  <span className="movie-card-tmdb-star" aria-hidden>
                    ★
                  </span>
                  <span className="movie-card-tmdb-score">{tmdbRatingDisplay}</span>
                  <span className="movie-card-tmdb-label">· TMDb rating</span>
                </div>

                <div
                  className="match-bar match-bar--tmdb"
                  aria-hidden
                >
                  <span style={{ width: `${tmdbBarPercent}%` }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
