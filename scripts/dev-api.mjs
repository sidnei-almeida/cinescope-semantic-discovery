/**
 * Run the serverless handler behind a plain HTTP server for local development.
 *
 * Vite proxies /api here, so the browser talks to the same paths it will use in
 * production. `npm run api`.
 */
import http from "node:http";

import handler from "../api/index.js";

const port = Number(process.env.PORT ?? 8000);

const server = http.createServer(async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error("[api]", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
    }
    res.end(JSON.stringify({ detail: String(error?.message ?? error) }));
  }
});

server.listen(port, () => {
  console.log(`semantic engine listening on http://127.0.0.1:${port}`);
});
