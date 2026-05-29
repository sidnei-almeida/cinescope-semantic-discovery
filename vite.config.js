import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const RECOMMENDER_TARGET =
  process.env.VITE_RECOMMENDER_PROXY_TARGET ||
  "https://tmdb-semantic-recommender.onrender.com";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/recommender": {
        target: RECOMMENDER_TARGET,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/recommender/, ""),
      },
    },
  },
});
