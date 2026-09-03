/**
 * CineScope semantic recommender — Vercel Node serverless function.
 *
 *     POST /api/v1/recommend   -> { query, recommendations[], count }
 *     GET  /api/health         -> { status, model_loaded, count }
 *
 * vercel.json routes every /api/* path here, so this handler does its own
 * dispatch on the original request path.
 */
import { getEngine } from "./_engine.js";

const MAX_TOP_K = 50;
const MIN_SYNOPSIS = 10;
const MAX_SYNOPSIS = 5000;

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(payload));
}

/** Vercel pre-parses JSON bodies; a plain node:http server does not. */
async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return null;
      }
    }
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function validate(body) {
  if (!body || typeof body !== "object") return "request body must be a JSON object";

  const synopsis = typeof body.synopsis === "string" ? body.synopsis.trim() : "";
  if (synopsis.length < MIN_SYNOPSIS) return `synopsis must be at least ${MIN_SYNOPSIS} characters`;
  if (synopsis.length > MAX_SYNOPSIS) return `synopsis must be at most ${MAX_SYNOPSIS} characters`;

  if (body.year != null) {
    const year = Number(body.year);
    if (!Number.isFinite(year) || year < 1888 || year > 2100) return "year must be between 1888 and 2100";
  }

  if (body.top_k != null) {
    const topK = Number(body.top_k);
    if (!Number.isFinite(topK) || topK < 1 || topK > MAX_TOP_K) {
      return `top_k must be between 1 and ${MAX_TOP_K}`;
    }
  }

  return null;
}

export default async function handler(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const route = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "OPTIONS") return send(res, 204, {});

  if (route.endsWith("/health")) {
    try {
      const engine = await getEngine();
      return send(res, 200, {
        status: "healthy",
        model_loaded: engine.loaded,
        count: engine.count,
        dim: engine.manifest.dim,
      });
    } catch (error) {
      return send(res, 503, { detail: `Recommendation engine unavailable: ${error.message}` });
    }
  }

  if (!route.endsWith("/recommend")) {
    return send(res, 404, { detail: `Not found: ${route}` });
  }

  if (req.method !== "POST") {
    return send(res, 405, { detail: "Use POST for /api/v1/recommend" });
  }

  const body = await readBody(req);
  const invalid = validate(body);
  if (invalid) return send(res, 400, { detail: invalid });

  let engine;
  try {
    engine = await getEngine();
  } catch (error) {
    return send(res, 503, { detail: `Recommendation engine unavailable: ${error.message}` });
  }

  try {
    const result = await engine.recommend({
      synopsis: body.synopsis,
      genre: body.genre ?? null,
      year: body.year ?? null,
      title: body.title ?? null,
      topK: body.top_k ?? 10,
    });
    return send(res, 200, result);
  } catch (error) {
    return send(res, error.statusCode ?? 500, { detail: error.message });
  }
}
