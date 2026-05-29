export const LOADING_MESSAGES = {
  boot: "Warming up the semantic engine...",
  bootRotate: [
    "Warming up the semantic engine...",
    "Connecting to TMDb...",
    "Preparing cinematic recommendations...",
    "Loading spotlight metadata...",
    "Calibrating semantic search...",
  ],
  wake1500: "Waking up the recommendation API...",
  wake5000: "Still waking up the backend. Cold starts can take a moment.",
  coldStartHint: "This may take a few seconds on cold start.",
  semantic: "Searching semantic space...",
  tmdb: "Enriching results with TMDb metadata...",
  ranking: "Ranking cinematic matches...",
  spotlight: "Preparing spotlight feature...",
};

export const BOOT_MIN_MS = 900;
export const BOOT_WAKE_MS = 1500;
export const BOOT_SLOW_MS = 5000;
export const BOOT_ROTATE_MS = 2800;
