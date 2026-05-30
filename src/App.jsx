import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoadingScreen from "./components/LoadingScreen.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import ModelPage from "./pages/ModelPage.jsx";
import DataPage from "./pages/DataPage.jsx";
import WorkflowPage from "./pages/WorkflowPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import { waitForRecommenderReady } from "./services/recommenderApi.js";
import {
  LOADING_MESSAGES,
  BOOT_READY_HOLD_MS,
  BOOT_ROTATE_MS,
  BOOT_HEALTH_POLL_MS,
} from "./config/loadingMessages.js";
import { delay, startWakeMessageTimers } from "./utils/loadingStages.js";

export default function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [bootMessage, setBootMessage] = useState(LOADING_MESSAGES.boot);
  const [bootFailed, setBootFailed] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    let rotateIndex = 0;

    const clearWake = startWakeMessageTimers(setBootMessage);

    const rotateTimer = window.setInterval(() => {
      rotateIndex = (rotateIndex + 1) % LOADING_MESSAGES.bootRotate.length;
      setBootMessage(LOADING_MESSAGES.bootRotate[rotateIndex]);
    }, BOOT_ROTATE_MS);

    setBootFailed(false);
    setBootMessage(LOADING_MESSAGES.boot);

    (async () => {
      const result = await waitForRecommenderReady({
        pollIntervalMs: BOOT_HEALTH_POLL_MS,
        signal: abort.signal,
      });

      if (cancelled) return;

      clearWake();
      window.clearInterval(rotateTimer);

      if (!result.ok) {
        setBootFailed(true);
        setBootMessage(LOADING_MESSAGES.bootTimeout);
        return;
      }

      setBootMessage(LOADING_MESSAGES.bootReady);
      await delay(BOOT_READY_HOLD_MS);

      if (!cancelled) setIsBooting(false);
    })();

    return () => {
      cancelled = true;
      abort.abort();
      clearWake();
      window.clearInterval(rotateTimer);
    };
  }, [bootAttempt]);

  if (isBooting) {
    return (
      <LoadingScreen
        message={bootMessage}
        showRetry={bootFailed}
        onRetry={() => {
          setBootFailed(false);
          setIsBooting(true);
          setBootAttempt((n) => n + 1);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DiscoverPage />} />
          <Route path="model" element={<ModelPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="workflow" element={<WorkflowPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
