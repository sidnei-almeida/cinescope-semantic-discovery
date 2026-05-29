import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import Header from "./components/Header.jsx";
import HeroSection from "./components/HeroSection.jsx";
import SpotlightMovie from "./components/SpotlightMovie.jsx";
import RecommendationGrid from "./components/RecommendationGrid.jsx";
import EngineSection from "./components/EngineSection.jsx";
import TechnicalSection from "./components/TechnicalSection.jsx";
import Footer from "./components/Footer.jsx";
import { focusSearchInput } from "./components/SearchHero.jsx";
import { searchMovie, getMovieDetails } from "./services/tmdbApi.js";
import {
  processRecommendations,
  processSynopsisQuery,
  normalizeSourceMovie,
} from "./services/movieEnrichment.js";
import { checkRecommenderHealth, isThematicQuery } from "./services/recommenderApi.js";
import { resolveDefaultSpotlightMovie } from "./utils/defaultSpotlight.js";

export default function App() {
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usedTmdbFallback, setUsedTmdbFallback] = useState(false);
  const [error, setError] = useState(null);
  const [wakingUp, setWakingUp] = useState(false);
  const [recommenderReady, setRecommenderReady] = useState(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    checkRecommenderHealth().then(({ ok, modelLoaded }) => {
      setRecommenderReady(ok && modelLoaded);
      if (!ok) setWakingUp(true);
    });
  }, []);

  const applyRecommendations = useCallback((recs, fallback) => {
    setRecommendations(recs);
    setUsedTmdbFallback(fallback);
  }, []);

  const loadMovieById = useCallback(
    async (movieId, options = {}) => {
      const { keepRecommendations = false } = options;

      setLoading(true);
      setError(null);
      setWakingUp(false);
      if (!keepRecommendations) setRecommendations([]);

      try {
        const details = await getMovieDetails(movieId);
        const normalized = normalizeSourceMovie(details);
        setSelectedMovie(normalized);
        setSelectedScore(null);

        if (!keepRecommendations) {
          const { recommendations: recs, usedTmdbFallback: fallback } =
            await processRecommendations(movieId, details);
          applyRecommendations(recs, fallback);
        }
      } catch (err) {
        if (err.isWakeUp) setWakingUp(true);
        setError(err.message || "Recommendation engine failed.");
        console.error("[CineScope]", err);
      } finally {
        setLoading(false);
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

  const handleSearch = useCallback(
    async (query) => {
      const trimmed = String(query ?? "").trim();
      setLoading(true);
      setError(null);
      setWakingUp(false);
      setRecommendations([]);

      try {
        if (trimmed.length < 3) {
          setError("Try a longer movie description, theme, or title.");
          return;
        }

        if (isThematicQuery(trimmed)) {
          const { recommendations: recs, usedTmdbFallback: fallback } =
            await processSynopsisQuery(trimmed);

          if (!recs.length) {
            setError("No results found. Try another title or mood.");
            return;
          }

          applyRecommendations(recs, fallback);
          const first = recs[0];
          const firstId = first.movie?.id ?? first.movie?.tmdbId;
          if (firstId) {
            const details = await getMovieDetails(firstId);
            setSelectedMovie(normalizeSourceMovie(details));
          } else {
            setSelectedMovie(first.movie);
          }
          setSelectedScore(first.score ?? null);
          return;
        }

        const tmdbResults = await searchMovie(trimmed, { limit: 1 });
        if (tmdbResults.length > 0) {
          await loadMovieById(tmdbResults[0].id);
          return;
        }

        if (trimmed.length < 10) {
          setError(
            "Try describing a movie, theme, or mood with a little more detail."
          );
          return;
        }

        const { recommendations: recs, usedTmdbFallback: fallback } =
          await processSynopsisQuery(trimmed);

        if (!recs.length) {
          setError("No results found. Try another title or mood.");
          return;
        }

        applyRecommendations(recs, fallback);
        const first = recs[0];
        const firstId = first.movie?.id ?? first.movie?.tmdbId;
        if (firstId) {
          const details = await getMovieDetails(firstId);
          setSelectedMovie(normalizeSourceMovie(details));
        } else {
          setSelectedMovie(first.movie);
        }
        setSelectedScore(first.score ?? null);
      } catch (err) {
        if (err.isWakeUp) setWakingUp(true);
        if (err.code === "QUERY_TOO_SHORT") {
          setError(
            "Try describing a movie, theme, or mood with a little more detail."
          );
        } else {
          setError(err.message || "Recommendation engine failed.");
        }
        console.error("[CineScope]", err);
      } finally {
        setLoading(false);
      }
    },
    [loadMovieById, applyRecommendations]
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
      const details = await getMovieDetails(movieId);
      setSelectedMovie(normalizeSourceMovie(details));
      document.getElementById("spotlight")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setSelectedMovie(entry.movie);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="app">
      <Header onSearchFocus={focusSearchInput} />

      <main className="site-main">
        <HeroSection
          onSearch={handleSearch}
          onSelectMovie={handleSelectFromSearch}
          disabled={loading}
        />

        {(wakingUp || recommenderReady === false || error) && (
          <div className="page-alerts page-container">
            {(wakingUp || recommenderReady === false) && (
              <div className="wake-banner">
                {recommenderReady === false
                  ? "Acordando o motor BERT no Render (pode levar ~30s na primeira busca)…"
                  : "Recommender API is waking up. Retrying may help…"}
              </div>
            )}
            {error && <div className="error-banner">{error}</div>}
          </div>
        )}

        <SpotlightMovie
          movie={selectedMovie}
          semanticScore={selectedScore}
          loading={loading && !selectedMovie}
        />

        {loading && selectedMovie && (
          <div className="page-loading page-container" aria-live="polite">
            <Loader2 size={22} className="spin" />
            <span>Updating recommendations…</span>
          </div>
        )}

        <div className={clsx("page-stream", loading && "page-stream--dimmed")}>
          <RecommendationGrid
            recommendations={recommendations}
            selectedId={selectedMovie?.id}
            onSelect={handleSelectRecommendation}
            usedTmdbFallback={usedTmdbFallback}
            loading={loading}
          />

          <EngineSection />
        </div>

        <TechnicalSection />
      </main>

      <Footer />
    </div>
  );
}
