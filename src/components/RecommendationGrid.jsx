import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import MovieCard from "./MovieCard.jsx";
import RecommendationSkeleton from "./RecommendationSkeleton.jsx";
import SortSelect from "./SortSelect.jsx";
import {
  filterRecommendations,
  sortRecommendations,
} from "../utils/recommendationFilters.js";

const SOURCE_FILTERS = [
  { value: "all", label: "All" },
  { value: "semantic_model", label: "Semantic" },
  { value: "tmdb_fallback", label: "TMDb" },
];

const SORT_OPTIONS = [
  { value: "best_match", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "tmdb_score", label: "TMDb score" },
  { value: "popularity", label: "Popularity" },
];

const PAGE_SIZE = 10;

export default function RecommendationGrid({
  recommendations,
  selectedId,
  onSelect,
  usedTmdbFallback,
  loading,
}) {
  const [titleFilter, setTitleFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("best_match");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const hasResults = recommendations?.length > 0;

  const filteredMovies = useMemo(
    () => filterRecommendations(recommendations ?? [], { titleFilter, sourceFilter }),
    [recommendations, titleFilter, sourceFilter]
  );

  const sortedMovies = useMemo(
    () => sortRecommendations(filteredMovies, sortBy),
    [filteredMovies, sortBy]
  );

  const visibleMovies = sortedMovies.slice(0, visibleCount);
  const canShowMore = visibleCount < sortedMovies.length;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [titleFilter, sourceFilter, sortBy, recommendations]);

  useEffect(() => {
    if (!import.meta.env.DEV || !hasResults) return;

    const sourceCounts = recommendations.reduce((acc, entry) => {
      const source =
        entry.movie?.recommendationSource || entry.movie?.source || "unknown";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    console.log("[CineScope] recommendation sources", sourceCounts);
  }, [recommendations, hasResults]);

  const countLabel = hasResults
    ? `${recommendations.length} movies matched from semantic search and TMDb discovery.`
    : null;

  return (
    <section className="recommendations-section" id="movies">
      <div className="recommendations-header">
        <div className="recommendations-header__lead">
          <h2>Recommended For You</h2>
          {usedTmdbFallback && hasResults && (
            <span className="section-tag">TMDb fallback</span>
          )}
          {countLabel && <p className="recommendations-count">{countLabel}</p>}
          {!hasResults && !loading && (
            <p className="recommendations-subtitle">
              Search a movie, mood, or theme to generate semantic recommendations.
            </p>
          )}
        </div>
        {hasResults && (
          <button
            type="button"
            className="view-all-button"
            onClick={() => setVisibleCount(sortedMovies.length)}
          >
            View all
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {hasResults && !loading && (
        <div className="recommendation-toolbar">
          <input
            type="search"
            className="recommendation-filter-input"
            placeholder="Filter by title..."
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            aria-label="Filter recommendations by title"
          />

          <div className="source-filter" role="group" aria-label="Filter by source">
            {SOURCE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={clsx(sourceFilter === value && "active")}
                onClick={() => setSourceFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <SortSelect
            className="recommendation-sort-select"
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
            ariaLabel="Sort recommendations"
          />
        </div>
      )}

      {loading && !hasResults ? (
        <div className="recommendation-grid recommendation-grid--loading">
          <RecommendationSkeleton count={10} />
        </div>
      ) : hasResults ? (
        <>
          {sortedMovies.length === 0 ? (
            <div className="recommendations-empty" role="status">
              No movies match these filters.
            </div>
          ) : (
            <div className="recommendation-grid">
              {visibleMovies.map((entry) => (
                <MovieCard
                  key={entry.movie?.id ?? entry.movie?.title}
                  entry={entry}
                  active={selectedId === entry.movie?.id}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}

          {canShowMore && sortedMovies.length > 0 && (
            <button
              type="button"
              className="show-more-button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Show more
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}
