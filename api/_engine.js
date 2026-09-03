/**
 * Semantic search engine for the CineScope recommender.
 *
 * Text goes in, the nearest films in a 62k-vector index come out. Two pieces:
 *
 *   encode  A quantized MiniLM ONNX encoder turns the metadata soup into a
 *           384-dimensional unit vector, in about 8 ms.
 *
 *           This uses onnxruntime-node, not onnxruntime-web. The WASM build is
 *           far smaller, but its int8 kernels do not agree with the native CPU
 *           ones: query vectors came out at 0.99 cosine from the reference, and
 *           only 84% of each top-10 survived. The index was built against the
 *           native kernels, so the query encoder has to use them too. The npm
 *           package ships binaries for five platforms; scripts/prune-runtime.mjs
 *           drops the four the deployment cannot run.
 *
 *   search  Every vector is scanned. The catalogue is stored as a per-row
 *           quantized int8 matrix (23 MB, exported from the original Annoy
 *           index by scripts/export_index.py), so the whole thing fits in
 *           memory and the nearest neighbours are exact rather than
 *           approximated.
 *
 * Movie metadata is JSONL plus an offset table, so a request seeks to the rows
 * it needs instead of parsing a 6 MB catalogue.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as ort from "onnxruntime-node";

const DIM = 384;

/**
 * Where the artifacts live at runtime.
 *
 * Sitting next to this module is the normal answer, but a bundler can move the
 * entry point away from the source tree, at which point import.meta.url no
 * longer points anywhere near api/model. Rather than assume a packaging
 * strategy, try the layouts that actually occur and fail loudly if none has the
 * manifest.
 */
function resolveModelDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "model"),
    path.join(here, "api", "model"),
    path.join(process.cwd(), "api", "model"),
    path.join(process.cwd(), "model"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "manifest.json"))) return candidate;
  }

  throw new EngineNotReady(
    `model artifacts not found; looked in ${candidates.join(", ")}`
  );
}

/** Rows scored per pass. Keeps the hot loop's working set cache-friendly. */
const CHUNK_ROWS = 4096;

export class EngineNotReady extends Error {}

export class SemanticEngine {
  constructor(modelDir = null) {
    this.modelDir = modelDir;
    this.loaded = false;
  }

  async load() {
    this.modelDir ??= resolveModelDir();
    this.manifest = JSON.parse(fs.readFileSync(path.join(this.modelDir, "manifest.json"), "utf8"));
    this.count = this.manifest.count;

    if (this.manifest.dim !== DIM) {
      throw new EngineNotReady(`expected ${DIM}-dimensional vectors, got ${this.manifest.dim}`);
    }

    ort.env.logLevel = "error";

    this.session = await ort.InferenceSession.create(path.join(this.modelDir, "encoder.onnx"), {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "basic",
      interOpNumThreads: 1,
      intraOpNumThreads: 1,
    });

    const { BertWordPieceTokenizer } = await import("./_tokenizer.js");
    this.tokenizer = new BertWordPieceTokenizer(path.join(this.modelDir, "vocab.txt"));

    this.codes = new Int8Array(readBinary(path.join(this.modelDir, "embeddings.i8.bin")).buffer);
    this.scales = new Float32Array(readBinary(path.join(this.modelDir, "scales.f32.bin")).buffer);
    this.ids = new Int32Array(readBinary(path.join(this.modelDir, "ids.i32.bin")).buffer);
    this.offsets = new BigInt64Array(
      readBinary(path.join(this.modelDir, "meta.offsets.i64.bin")).buffer
    );
    this.metaPath = path.join(this.modelDir, "meta.jsonl");

    if (this.scales.length !== this.count || this.ids.length !== this.count) {
      throw new EngineNotReady("artifact row counts do not match manifest");
    }

    this.loaded = true;
  }

  async encode(text) {
    const { ids, attentionMask } = this.tokenizer.encode(text);
    const length = ids.length;

    const inputIds = BigInt64Array.from(ids, BigInt);
    const mask = BigInt64Array.from(attentionMask, BigInt);

    const feeds = {};
    for (const name of this.session.inputNames) {
      const lowered = name.toLowerCase();
      if (lowered.includes("token_type") || lowered.includes("segment")) {
        feeds[name] = new ort.Tensor("int64", new BigInt64Array(length), [1, length]);
      } else if (lowered.includes("input_ids")) {
        feeds[name] = new ort.Tensor("int64", inputIds, [1, length]);
      } else if (lowered.includes("attention") || lowered.includes("mask")) {
        feeds[name] = new ort.Tensor("int64", mask, [1, length]);
      }
    }

    const output = await this.session.run(feeds);
    const hidden = output[this.session.outputNames[0]].data;

    // Mean pooling over the unpadded positions, then L2 normalize.
    const pooled = new Float32Array(DIM);
    let counted = 0;
    for (let position = 0; position < length; position++) {
      if (attentionMask[position] === 0) continue;
      counted += 1;
      const base = position * DIM;
      for (let d = 0; d < DIM; d++) pooled[d] += hidden[base + d];
    }

    const divisor = counted || 1;
    let norm = 0;
    for (let d = 0; d < DIM; d++) {
      pooled[d] /= divisor;
      norm += pooled[d] * pooled[d];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let d = 0; d < DIM; d++) pooled[d] /= norm;
    }
    return pooled;
  }

  /** Exact cosine top-k over the whole catalogue. */
  search(query, topK) {
    const { count, codes, scales } = this;
    const scores = new Float32Array(count);

    for (let start = 0; start < count; start += CHUNK_ROWS) {
      const end = Math.min(start + CHUNK_ROWS, count);
      for (let row = start; row < end; row++) {
        const base = row * DIM;
        let dot = 0;
        for (let d = 0; d < DIM; d++) dot += codes[base + d] * query[d];
        scores[row] = dot * scales[row];
      }
    }

    // Partial selection: the result set is tiny next to the catalogue, so a
    // running top-k beats sorting 62k entries.
    const k = Math.min(topK, count);
    const best = [];
    let floor = -Infinity;

    for (let row = 0; row < count; row++) {
      const score = scores[row];
      if (best.length === k && score <= floor) continue;

      let position = best.length;
      while (position > 0 && best[position - 1].score < score) position -= 1;
      best.splice(position, 0, { row, score });
      if (best.length > k) best.pop();
      floor = best[best.length - 1].score;
    }

    return best;
  }

  metadata(rows) {
    const handle = fs.openSync(this.metaPath, "r");
    try {
      const result = new Map();
      for (const row of [...rows].sort((a, b) => a - b)) {
        const start = Number(this.offsets[row]);
        const length = Number(this.offsets[row + 1]) - start;
        const buffer = Buffer.allocUnsafe(length);
        fs.readSync(handle, buffer, 0, length, start);
        result.set(row, JSON.parse(buffer.toString("utf8")));
      }
      return result;
    } finally {
      fs.closeSync(handle);
    }
  }

  async recommend({ synopsis, genre, year, title, topK = 10 }) {
    const soup = buildSoup({
      title,
      overview: synopsis,
      genres: splitGenres(genre),
      year,
    });

    if (soup.trim().length < 10) {
      const error = new Error("synopsis must be at least 10 characters");
      error.statusCode = 400;
      throw error;
    }

    const hits = this.search(await this.encode(soup), topK);
    const meta = this.metadata(hits.map((hit) => hit.row));

    const recommendations = hits.map(({ row, score }) => {
      const entry = meta.get(row) ?? {};
      return {
        movie_id: this.ids[row],
        similarity_score: Math.max(0, Math.min(1, score)),
        title: entry.t ?? null,
        overview: null,
        year: entry.y ?? null,
        poster_path: entry.p ?? null,
        genres_list: entry.g ?? [],
      };
    });

    return { query: soup, recommendations, count: recommendations.length };
  }
}

function readBinary(file) {
  const buffer = fs.readFileSync(file);
  // Copy out of the pooled allocator so the typed-array view owns its bytes.
  return new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

export function splitGenres(genre) {
  if (!genre) return [];
  return String(genre)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Rebuild the exact training-time text format. Field order and the per-field
 * caps matter: the indexed vectors were produced from this layout, so any
 * deviation moves the query away from its own neighbourhood.
 *
 *     Keyword (5) . Genre (3) . Director (2) . Studio (2) . Country (1) .
 *     Year . Title . Overview
 */
export function buildSoup({
  title,
  overview,
  genres,
  directors,
  studios,
  countries,
  year,
  keywords,
} = {}) {
  const parts = [];

  const extend = (label, values, limit) => {
    for (const value of (values ?? []).slice(0, limit)) {
      if (value && String(value).trim()) parts.push(`${label}: ${String(value).trim()}`);
    }
  };

  extend("Keyword", keywords, 5);
  extend("Genre", genres, 3);
  extend("Director", directors, 2);
  extend("Studio", studios, 2);
  extend("Country", countries, 1);

  if (year) parts.push(`Year: ${year}`);
  if (title && String(title).trim()) parts.push(`Title: ${String(title).trim()}`);
  if (overview && String(overview).trim()) parts.push(`Overview: ${String(overview).trim()}`);

  return parts.join(". ");
}

// Loaded once per warm instance; a cold start pays for it, later requests do not.
let enginePromise = null;

export function getEngine() {
  if (!enginePromise) {
    const engine = new SemanticEngine();
    enginePromise = engine.load().then(
      () => engine,
      (error) => {
        // Let the next request retry rather than caching a transient failure.
        enginePromise = null;
        throw error;
      }
    );
  }
  return enginePromise;
}
