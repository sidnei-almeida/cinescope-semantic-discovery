import { useState, useCallback, useEffect, useRef } from "react";
import clsx from "clsx";
import Header from "./components/Header.jsx";
import HeroSection from "./components/HeroSection.jsx";
import SpotlightMovie from "./components/SpotlightMovie.jsx";
import RecommendationGrid from "./components/RecommendationGrid.jsx";
import EngineSection from "./components/EngineSection.jsx";
import ModelSection from "./components/ModelSection.jsx";
import DataSection from "./components/DataSection.jsx";
import AboutSection from "./components/AboutSection.jsx";
import TechnicalSection from "./components/TechnicalSection.jsx";
import Footer from "./components/Footer.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import { focusSearchInput } from "./components/SearchHero.jsx";
import { searchMovie, getMovieDetails } from "./services/tmdbApi.js";
import {
  processRecommendations,
  processSynopsisQuery,
  normalizeSourceMovie,
} from "./services/movieEnrichment.js";
import { checkRecommenderHealth, isThematicQuery } from "./services/recommenderApi.js";
import { resolveDefaultSpotlightMovie } from "./utils/defaultSpotlight.js";
import {
  LOADING_MESSAGES,
  BOOT_MIN_MS,
  BOOT_ROTATE_MS,
} from "./config/loadingMessages.js";
import {
  delay,
  runWithRecommendationStages,
  startWakeMessageTimers,
} from "./utils/loadingStages.js";

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [bootMessage, setBootMessage] = useState(LOADING_MESSAGES.boot);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(null);
  const [inlineStatusMessage, setInlineStatusMessage] = useState(null);
  const [usedTmdbFallback, setUsedTmdbFallback] = useState(false);
  const [error, setError] = useState(null);
  const [wakingUp, setWakingUp] = useState(false);
  const [recommenderReady, setRecommenderReady] = useState(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let rotateIndex = 0;
    const clearWake = startWakeMessageTimers(setBootMessage);

    const rotateTimer = window.setInterval(() => {
      rotateIndex = (rotateIndex + 1) % LOADING_MESSAGES.bootRotate.length;
      setBootMessage(LOADING_MESSAGES.bootRotate[rotateIndex]);
    }, BOOT_ROTATE_MS);

    Promise.all([checkRecommenderHealth(), delay(BOOT_MIN_MS)]).then(([health]) => {
      if (cancelled) return;
      const ready = health.ok && health.modelLoaded;
      setRecommenderReady(ready);
      if (!ready) setWakingUp(true);
      setIsBooting(false);
    });

    return () => {
      cancelled = true;
      clearWake();
      window.clearInterval(rotateTimer);
    };
  }, []);

  const applyRecommendations = useCallback((recs, fallback) => {
    setRecommendations(recs);
    setUsedTmdbFallback(fallback);
  }, []);

  const loadMovieById = useCallback(
    async (movieId, options = {}) => {
      const { keepRecommendations = false } = options;
      let clearSearchWake = null;

      setLoading(true);
      setError(null);
      setWakingUp(false);
      setInlineStatusMessage(null);
      if (!keepRecommendations) setRecommendations([]);

      try {
        setLoadingStage("spotlight");
        const details = await getMovieDetails(movieId);
        const normalized = normalizeSourceMovie(details);
        setSelectedMovie(normalized);
        setSelectedScore(null);

        if (!keepRecommendations) {
          clearSearchWake = startWakeMessageTimers(setInlineStatusMessage);

          const result = await runWithRecommendationStages(setLoadingStage, () =>
            processRecommendations(movieId, details)
          );
          applyRecommendations(result.recommendations, result.usedTmdbFallback);
        }
      } catch (err) {
        if (err.isWakeUp) setWakingUp(true);
        setError(err.message || "Recommendation engine failed.");
        console.error("[CineScope]", err);
      } finally {
        clearSearchWake?.();
        setLoading(false);
        setLoadingStage(null);
        setInlineStatusMessage(null);
      }
    },
    [applyRecommendations]
  );

  useEffect(() => {
    if (isBooting || initialLoadDone.current) return;
    initialLoadDone.current = true;

    resolveDefaultSpotlightMovie()
      .then((movie) => {
        if (movie?.id) return loadMovieById(movie.id);
      })
      .catch((err) => {
        console.warn("[CineScope] default spotlight load failed:", err?.message);
      });
  }, [isBooting, loadMovieById]);

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
      let clearSearchWake = null;

      setLoading(true);
      setError(null);
      setWakingUp(false);
      setInlineStatusMessage(null);
      setRecommendations([]);

      try {
        if (trimmed.length < 3) {
          setError("Try a longer movie description, theme, or title.");
          return;
        }

        clearSearchWake = startWakeMessageTimers(setInlineStatusMessage);

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
          clearSearchWake?.();
          clearSearchWake = null;
          await loadMovieById(tmdbResults[0].id);
          return;
        }

        if (trimmed.length < 10) {
          setError(
            "Try describing a movie, theme, or mood with a little more detail."
          );
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
        clearSearchWake?.();
        setLoading(false);
        setLoadingStage(null);
        setInlineStatusMessage(null);
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
    setInlineStatusMessage(null);

    try {
      setLoadingStage("spotlight");
      const details = await getMovieDetails(movieId);
      setSelectedMovie(normalizeSourceMovie(details));
      document.getElementById("spotlight")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setSelectedMovie(entry.movie);
    } finally {
      setLoading(false);
      setLoadingStage(null);
      setInlineStatusMessage(null);
    }
  }, []);

  if (isBooting) {
    return <LoadingScreen message={bootMessage} />;
  }

  const showInlineStatus = loading && (loadingStage || inlineStatusMessage);

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
                  : "O modelo BERT no Render está acordando — tente buscar de novo em alguns segundos."}
              </div>
            )}
            {error && <div className="error-banner">{error}</div>}
          </div>
        )}

        <SpotlightMovie
          movie={selectedMovie}
          semanticScore={selectedScore}
          loading={loading && !selectedMovie}
          loadingStage={showInlineStatus ? loadingStage : null}
          inlineStatusMessage={showInlineStatus ? inlineStatusMessage : null}
        />

        <div className={clsx("page-stream", loading && "page-stream--dimmed")}>
          <RecommendationGrid
            recommendations={recommendations}
            selectedId={selectedMovie?.id}
            onSelect={handleSelectRecommendation}
            usedTmdbFallback={usedTmdbFallback}
            loading={loading}
            loadingStage={showInlineStatus ? loadingStage : null}
            inlineStatusMessage={showInlineStatus ? inlineStatusMessage : null}
          />

          <ModelSection />
          <DataSection />
          <EngineSection />
        </div>

        <TechnicalSection />
        <AboutSection />
      </main>

      <Footer />
    </div>
  );
}
