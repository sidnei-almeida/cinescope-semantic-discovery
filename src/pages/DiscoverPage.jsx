import { useState, useCallback, useEffect, useRef } from "react";
import clsx from "clsx";
import HeroSection from "../components/HeroSection.jsx";
import SpotlightMovie from "../components/SpotlightMovie.jsx";
import RecommendationGrid from "../components/RecommendationGrid.jsx";
import { searchMovie, getMovieDetails } from "../services/tmdbApi.js";
import {
  processRecommendations,
  processSynopsisQuery,
  normalizeSourceMovie,
} from "../services/movieEnrichment.js";
import { isThematicQuery } from "../services/recommenderApi.js";
import { resolveDefaultSpotlightMovie } from "../utils/defaultSpotlight.js";
import { runWithRecommendationStages } from "../utils/loadingStages.js";

export default function DiscoverPage() {
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(null);
  const [usedTmdbFallback, setUsedTmdbFallback] = useState(false);
  const [error, setError] = useState(null);
  const initialLoadDone = useRef(false);

  const applyRecommendations = useCallback((recs, fallback) => {
    setRecommendations(recs);
    setUsedTmdbFallback(fallback);
  }, []);

  const loadMovieById = useCallback(
    async (movieId, options = {}) => {
      const { keepRecommendations = false } = options;

      setLoading(true);
      setError(null);
      if (!keepRecommendations) setRecommendations([]);

      try {
        setLoadingStage("spotlight");
        const details = await getMovieDetails(movieId);
        const normalized = normalizeSourceMovie(details);
        setSelectedMovie(normalized);
        setSelectedScore(null);

        if (!keepRecommendations) {
          const result = await runWithRecommendationStages(setLoadingStage, () =>
            processRecommendations(movieId, details)
          );
          applyRecommendations(result.recommendations, result.usedTmdbFallback);
        }
      } catch (err) {
        setError(err.message || "Recommendation engine failed.");
        console.error("[CineScope]", err);
      } finally {
        setLoading(false);
        setLoadingStage(null);
      }
    },
    [applyRecommendations]
  );

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    resolveDefaultSpotlightMovie()
      .then((movie) => {
        if (movie?.id) return loadMovieById(movie.id);
      })
      .catch((err) => {
        console.warn("[CineScope] default spotlight load failed:", err?.message);
      });
  }, [loadMovieById]);

  const handleSelectFromSearch = useCallback(
    async (movieResult) => {
      if (!movieResult?.id) return;
      await loadMovieById(movieResult.id);
    },
    [loadMovieById]
  );

  const applySynopsisResults = useCallback(
    async (recs, fallback) => {
      applyRecommendations(recs, fallback);
      const first = recs[0];
      const firstId = first.movie?.id ?? first.movie?.tmdbId;
      if (firstId) {
        setLoadingStage("spotlight");
        const details = await getMovieDetails(firstId);
        setSelectedMovie(normalizeSourceMovie(details));
      } else {
        setSelectedMovie(first.movie);
      }
      setSelectedScore(first.score ?? null);
    },
    [applyRecommendations]
  );

  const handleSearch = useCallback(
    async (query) => {
      const trimmed = String(query ?? "").trim();

      setLoading(true);
      setError(null);
      setRecommendations([]);

      try {
        if (trimmed.length < 3) {
          setError("Try a longer movie description, theme, or title.");
          return;
        }

        if (isThematicQuery(trimmed)) {
          const result = await runWithRecommendationStages(setLoadingStage, () =>
            processSynopsisQuery(trimmed)
          );

          if (!result.recommendations.length) {
            setError("No results found. Try another title or mood.");
            return;
          }

          await applySynopsisResults(result.recommendations, result.usedTmdbFallback);
          return;
        }

        const tmdbResults = await searchMovie(trimmed, { limit: 1 });
        if (tmdbResults.length > 0) {
          await loadMovieById(tmdbResults[0].id);
          return;
        }

        if (trimmed.length < 10) {
          setError("Try describing a movie, theme, or mood with a little more detail.");
          return;
        }

        const result = await runWithRecommendationStages(setLoadingStage, () =>
          processSynopsisQuery(trimmed)
        );

        if (!result.recommendations.length) {
          setError("No results found. Try another title or mood.");
          return;
        }

        await applySynopsisResults(result.recommendations, result.usedTmdbFallback);
      } catch (err) {
        if (err.code === "QUERY_TOO_SHORT") {
          setError("Try describing a movie, theme, or mood with a little more detail.");
        } else {
          setError(err.message || "Recommendation engine failed.");
        }
        console.error("[CineScope]", err);
      } finally {
        setLoading(false);
        setLoadingStage(null);
      }
    },
    [loadMovieById, applySynopsisResults]
  );

  const handleSelectRecommendation = useCallback(async (entry) => {
    const movieId = entry.movie?.id ?? entry.movie?.tmdbId;
    setSelectedScore(entry.score ?? null);

    if (!movieId) {
      setSelectedMovie(entry.movie);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setLoadingStage("spotlight");
      const details = await getMovieDetails(movieId);
      setSelectedMovie(normalizeSourceMovie(details));
      document
        .getElementById("spotlight")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setSelectedMovie(entry.movie);
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  }, []);

  const activeStage = loading ? loadingStage : null;

  return (
    <div className="page-enter">
      <main className="site-main">
        <HeroSection
          onSearch={handleSearch}
          onSelectMovie={handleSelectFromSearch}
          disabled={loading}
          backdropUrl={selectedMovie?.backdropUrl}
        />

        {error && (
          <div className="page-alerts page-container">
            <div className="error-banner">{error}</div>
          </div>
        )}

        <SpotlightMovie
          movie={selectedMovie}
          semanticScore={selectedScore}
          loading={loading && !selectedMovie}
          loadingStage={activeStage}
        />

        <div className={clsx("page-stream", loading && "page-stream--dimmed")}>
          <RecommendationGrid
            recommendations={recommendations}
            selectedId={selectedMovie?.id}
            onSelect={handleSelectRecommendation}
            usedTmdbFallback={usedTmdbFallback}
            loading={loading}
            loadingStage={activeStage}
          />
        </div>
      </main>
    </div>
  );
}
