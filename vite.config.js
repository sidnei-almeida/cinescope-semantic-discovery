import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `npm run api` starts the recommender locally; the dev server forwards /api to
// it so the browser talks to the same paths it will use in production.
const API_TARGET = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
