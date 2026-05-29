import {
  LOADING_MESSAGES,
  BOOT_WAKE_MS,
  BOOT_SLOW_MS,
} from "../config/loadingMessages.js";

export function getLoadingMessage(stage) {
  if (!stage) return null;
  return LOADING_MESSAGES[stage] ?? null;
}

/**
 * Timers de wake-up (1.5s / 5s) — não são erros, só feedback de cold start.
 */
export function startWakeMessageTimers(setMessage, options = {}) {
  const { at1500 = BOOT_WAKE_MS, at5000 = BOOT_SLOW_MS } = options;

  const timer1500 = window.setTimeout(() => {
    setMessage(LOADING_MESSAGES.wake1500);
  }, at1500);

  const timer5000 = window.setTimeout(() => {
    setMessage(LOADING_MESSAGES.wake5000);
  }, at5000);

  return () => {
    window.clearTimeout(timer1500);
    window.clearTimeout(timer5000);
  };
}

const STAGE_DELAYS = {
  semantic: 0,
  tmdb: 650,
  ranking: 1400,
};

/**
 * Aproxima estágios visuais sem alterar o pipeline de enrichment.
 */
export async function runWithRecommendationStages(setLoadingStage, task) {
  const timers = Object.entries(STAGE_DELAYS).map(([stage, delay]) =>
    window.setTimeout(() => setLoadingStage(stage), delay)
  );

  setLoadingStage("semantic");

  try {
    return await task();
  } finally {
    timers.forEach((id) => window.clearTimeout(id));
    setLoadingStage(null);
  }
}

export function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
