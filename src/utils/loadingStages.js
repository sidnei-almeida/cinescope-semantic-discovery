import { LOADING_MESSAGES } from "../config/loadingMessages.js";

export function getLoadingMessage(stage) {
  if (!stage) return null;
  return LOADING_MESSAGES[stage] ?? null;
}

/** Stage labels are paced to the real pipeline: retrieve, enrich, rank. */
const STAGE_DELAYS = {
  semantic: 0,
  tmdb: 400,
  ranking: 1100,
};

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
