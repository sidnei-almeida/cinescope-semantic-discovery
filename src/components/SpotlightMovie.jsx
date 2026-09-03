import { Play, Film, ExternalLink } from "lucide-react";
import { formatRuntime } from "../utils/formatters.js";
import { getPosterUrl } from "../utils/movieFallbacks.js";
import { buildYouTubeWatchUrl, resolveTrailerKey } from "../utils/youtube.js";
import ScoreStrip from "./ScoreStrip.jsx";
import CastMember from "./spotlight/CastMember.jsx";
import InlineLoadingStatus from "./InlineLoadingStatus.jsx";

function resolveCast(movie) {
  if (!movie) return [];
  const raw = movie.cast || movie.starring || movie.credits?.cast || [];
  return raw.slice(0, 5);
}

function resolvePosterUrl(movie) {
  if (!movie) return null;
  return movie.posterUrl || getPosterUrl(movie);
}

function resolveCertification(movie) {
  if (movie?.certification) return movie.certification;
  const usRelease = movie?.raw?.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
  const cert = usRelease?.release_dates?.find((d) => d.certification)?.certification;
  return cert || null;
}

function SpotlightCardShell({ children, className = "", style }) {
  return (
    <article className={`spotlight-card ${className}`.trim()} style={style}>
      {children}
    </article>
  );
}

function SpotlightSkeleton() {
  return (
    <SpotlightCardShell className="spotlight-card--loading">
      <div className="spotlight-poster-column">
        <div className="spotlight-poster spotlight-poster--placeholder skeleton-shimmer" />
      </div>
      <div className="spotlight-content">
        <div className="skeleton-line skeleton-line--eyebrow" />
        <div className="skeleton-line skeleton-line--title" />
        <div className="skeleton-line" />
        <div className="spotlight-score-strip skeleton-shimmer" style={{ minHeight: 56 }} />
      </div>
      <aside className="spotlight-cast-panel">
        <div className="skeleton-line skeleton-line--short" />
        <div className="spotlight-cast-row">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="cast-avatar cast-avatar--fallback skeleton-shimmer" />
          ))}
        </div>
      </aside>
    </SpotlightCardShell>
  );
}

function EmptySpotlight() {
  return (
    <SpotlightCardShell className="spotlight-card--empty">
      <div className="spotlight-poster-column">
        <div className="spotlight-poster spotlight-poster--placeholder">
          <Film size={40} strokeWidth={1.2} />
        </div>
      </div>

      <div className="spotlight-content">
        <div className="spotlight-eyebrow">Featured spotlight</div>
        <h2 className="spotlight-title">Choose a film to begin</h2>
        <p className="spotlight-overview spotlight-empty-lead">
          Search above for a title, a mood, or a theme. The engine embeds what you type
          and returns the closest films in the index.
        </p>
      </div>

      <aside className="spotlight-cast-panel">
        <h3>Starring</h3>
        <div className="spotlight-cast-row spotlight-cast-row--placeholder">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="cast-member cast-member--ghost">
              <span className="cast-avatar cast-avatar--fallback">?</span>
            </div>
          ))}
        </div>
      </aside>
    </SpotlightCardShell>
  );
}

function FilledSpotlight({ movie, semanticScore }) {
  const cast = resolveCast(movie);
  const certification = resolveCertification(movie);
  const runtime = formatRuntime(movie.runtime);
  const trailerWatchUrl = buildYouTubeWatchUrl(resolveTrailerKey(movie));
  const tmdbId = movie.tmdbId ?? movie.id;

  return (
    <SpotlightCardShell
      style={
        movie.backdropUrl
          ? { "--spotlight-accent": `url(${movie.backdropUrl})` }
          : undefined
      }
    >
      <div className="spotlight-poster-column">
        <img
          className="spotlight-poster"
          src={resolvePosterUrl(movie)}
          alt={`${movie.title} poster`}
        />
      </div>

      <div className="spotlight-content">
        <div className="spotlight-eyebrow">Featured spotlight</div>
        <h2 className="spotlight-title">{movie.title}</h2>

        <div className="spotlight-meta">
          {movie.year != null && <span>{movie.year}</span>}
          {runtime !== "—" && <span>{runtime}</span>}
          {certification && <span>{certification}</span>}
          {movie.director && <span>{movie.director}</span>}
        </div>

        {movie.genres?.length > 0 && (
          <div className="spotlight-genres">
            {movie.genres.map((genre) => {
              const label = typeof genre === "string" ? genre : genre?.name;
              if (!label) return null;
              return (
                <span key={label} className="spotlight-genre-chip">
                  {label}
                </span>
              );
            })}
          </div>
        )}

        <p className="spotlight-overview">{movie.overview}</p>

        <ScoreStrip movie={movie} semanticScore={semanticScore} />
      </div>

      <aside className="spotlight-cast-panel">
        <h3>Starring</h3>
        <div className="spotlight-cast-row">
          {cast.length > 0 ? (
            cast.map((member) => (
              <CastMember key={member.id ?? member.name} member={member} />
            ))
          ) : (
            <p className="spotlight-cast-empty">Cast data unavailable</p>
          )}
        </div>

        <div className="spotlight-actions">
          {trailerWatchUrl ? (
            <a
              href={trailerWatchUrl}
              className="watch-trailer-button"
              target="_blank"
              rel="noopener"
            >
              <Play size={15} fill="currentColor" />
              Watch trailer
            </a>
          ) : (
            <button type="button" className="watch-trailer-button" disabled>
              <Play size={15} />
              No trailer
            </button>
          )}

          {tmdbId && (
            <a
              className="spotlight-tmdb-link"
              href={`https://www.themoviedb.org/movie/${tmdbId}`}
              target="_blank"
              rel="noreferrer"
            >
              View on TMDb
              <ExternalLink size={14} strokeWidth={1.75} />
            </a>
          )}
        </div>
      </aside>
    </SpotlightCardShell>
  );
}

export default function SpotlightMovie({ movie, semanticScore, loading, loadingStage }) {
  return (
    <section id="spotlight" className="spotlight-section" aria-label="Featured spotlight">
      {loadingStage && (
        <div className="spotlight-loading-bar">
          <InlineLoadingStatus stage={loadingStage} />
        </div>
      )}

      {loading ? (
        <SpotlightSkeleton />
      ) : !movie ? (
        <EmptySpotlight />
      ) : (
        <FilledSpotlight movie={movie} semanticScore={semanticScore} />
      )}
    </section>
  );
}
