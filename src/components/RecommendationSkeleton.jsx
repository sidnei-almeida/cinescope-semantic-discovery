export default function RecommendationSkeleton({ count = 5 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <article key={i} className="movie-card movie-card-skeleton" aria-hidden>
          <div className="skeleton-image skeleton-shimmer" />
          <div className="movie-card-body">
            <div className="skeleton-line skeleton-line--title" />
            <div className="skeleton-line skeleton-line--short" />
            <div className="skeleton-bar skeleton-shimmer" />
          </div>
        </article>
      ))}
    </>
  );
}
