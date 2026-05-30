export const LOADING_MESSAGES = {
  boot: "Waking up the semantic engine on Render…",
  bootRotate: [
    "Waking up the semantic engine on Render…",
    "Loading ONNX embeddings and Annoy index…",
    "Waiting for FastAPI health check…",
    "Cold starts can take up to a minute…",
  ],
  bootReady: "Semantic engine online. Opening CineScope…",
  bootTimeout:
    "The recommender is taking longer than expected. Check your connection or try again.",
  wake1500: "Waking up the recommendation API...",
  wake5000: "Still waking up the backend. Cold starts can take a moment.",
  coldStartHint: "This may take a few seconds on cold start.",
  semantic: "Searching semantic space...",
  tmdb: "Enriching results with TMDb metadata...",
  ranking: "Ranking cinematic matches...",
  spotlight: "Preparing spotlight feature...",
};

/** Brief hold after health OK before revealing the app. */
export const BOOT_READY_HOLD_MS = 450;
export const BOOT_WAKE_MS = 1500;
export const BOOT_SLOW_MS = 5000;
export const BOOT_ROTATE_MS = 3200;
export const BOOT_HEALTH_POLL_MS = 2500;
