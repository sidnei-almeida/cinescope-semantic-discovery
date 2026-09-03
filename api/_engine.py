"""
Semantic search engine for the CineScope recommender, tuned for Vercel.

Two things changed relative to the original Render deployment:

1. Annoy is gone. It is a C++ extension without wheels, so it cannot be built
   inside a Vercel Python function. The 62k item vectors were exported from the
   Annoy index into a per-row quantized int8 matrix (see scripts/export_index.py)
   and search is now an exact brute-force cosine scan with numpy — 23 MB instead
   of 132 MB, and more accurate than the approximate tree search it replaces.

2. Movie metadata is stored as JSONL plus an offset table, so a request seeks
   directly to the handful of rows it needs instead of unpickling a 6 MB dict.

The text -> vector half is unchanged: the same quantized MiniLM ONNX encoder and
the same "metadata soup" prompt format used when the index was built.
"""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any, Iterable, Sequence

import numpy as np
import onnxruntime as ort

from _tokenizer import BertWordPieceTokenizer

MODEL_DIR = Path(__file__).resolve().parent / "model"
DIM = 384

# Rows converted to float32 per matmul block. 8192 x 384 x 4B = 12 MB of scratch,
# which keeps peak memory flat regardless of how large the catalogue grows.
CHUNK_ROWS = 8192


class EngineNotReady(RuntimeError):
    """Raised when the engine failed to load its artifacts."""


class SemanticEngine:
    def __init__(self, model_dir: Path = MODEL_DIR):
        self.model_dir = model_dir
        self.manifest: dict[str, Any] = {}
        self.count = 0

        self._session: ort.InferenceSession | None = None
        self._tokenizer: BertWordPieceTokenizer | None = None
        self._codes: np.memmap | None = None
        self._scales: np.ndarray | None = None
        self._ids: np.ndarray | None = None
        self._offsets: np.ndarray | None = None
        self._meta_path = model_dir / "meta.jsonl"
        self._input_plan: list[tuple[str, str]] = []

    # ── loading ────────────────────────────────────────────────────────────

    def load(self) -> None:
        self.manifest = json.loads((self.model_dir / "manifest.json").read_text())
        self.count = int(self.manifest["count"])

        if int(self.manifest["dim"]) != DIM:
            raise EngineNotReady(f"expected {DIM}-dimensional vectors, got {self.manifest['dim']}")

        options = ort.SessionOptions()
        # The function has a hard memory ceiling and a single request in flight;
        # arena/pattern allocators only add overhead here.
        options.enable_cpu_mem_arena = False
        options.enable_mem_pattern = False
        options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
        options.intra_op_num_threads = 1

        self._session = ort.InferenceSession(
            str(self.model_dir / "encoder.onnx"),
            sess_options=options,
            providers=["CPUExecutionProvider"],
        )
        self._input_plan = [(inp.name, _classify_input(inp.name)) for inp in self._session.get_inputs()]

        # Pure-Python WordPiece, verified token-for-token against the reference
        # tokenizer by scripts/check_tokenizer.py. Truncation (128) and padding
        # match training, so the query is embedded exactly like the index items.
        self._tokenizer = BertWordPieceTokenizer(self.model_dir / "vocab.txt")

        self._codes = np.memmap(
            self.model_dir / "embeddings.i8.bin",
            dtype=np.int8,
            mode="r",
            shape=(self.count, DIM),
        )
        self._scales = np.fromfile(self.model_dir / "scales.f32.bin", dtype=np.float32)
        self._ids = np.fromfile(self.model_dir / "ids.i32.bin", dtype=np.int32)
        self._offsets = np.fromfile(self.model_dir / "meta.offsets.i64.bin", dtype=np.int64)

        if len(self._scales) != self.count or len(self._ids) != self.count:
            raise EngineNotReady("artifact row counts do not match manifest")

    @property
    def is_loaded(self) -> bool:
        return self._session is not None and self._codes is not None

    # ── embedding ──────────────────────────────────────────────────────────

    def encode(self, text: str) -> np.ndarray:
        if self._session is None or self._tokenizer is None:
            raise EngineNotReady("encoder is not loaded")

        token_ids, mask = self._tokenizer.encode(text)
        input_ids = np.array([token_ids], dtype=np.int64)
        attention_mask = np.array([mask], dtype=np.int64)

        feeds: dict[str, np.ndarray] = {}
        for name, kind in self._input_plan:
            if kind == "ids":
                feeds[name] = input_ids
            elif kind == "mask":
                feeds[name] = attention_mask
            elif kind == "token_type":
                feeds[name] = np.zeros_like(input_ids)

        last_hidden_state = self._session.run(None, feeds)[0]

        mask = attention_mask[..., None].astype(np.float32)
        pooled = (last_hidden_state * mask).sum(axis=1) / np.maximum(mask.sum(axis=1), 1e-9)

        vector = pooled[0].astype(np.float32)
        norm = float(np.linalg.norm(vector))
        return vector / norm if norm else vector

    # ── search ─────────────────────────────────────────────────────────────

    def search(self, query: np.ndarray, top_k: int) -> list[tuple[int, float]]:
        """Exact cosine top-k over the whole catalogue."""
        if self._codes is None or self._scales is None:
            raise EngineNotReady("index is not loaded")

        scores = np.empty(self.count, dtype=np.float32)
        for start in range(0, self.count, CHUNK_ROWS):
            end = min(start + CHUNK_ROWS, self.count)
            block = np.asarray(self._codes[start:end], dtype=np.float32)
            np.dot(block, query, out=scores[start:end])
            scores[start:end] *= self._scales[start:end]

        k = min(top_k, self.count)
        top = np.argpartition(-scores, k - 1)[:k]
        top = top[np.argsort(-scores[top])]
        return [(int(i), float(scores[i])) for i in top]

    # ── metadata ───────────────────────────────────────────────────────────

    def metadata(self, rows: Sequence[int]) -> dict[int, dict[str, Any]]:
        if self._offsets is None:
            raise EngineNotReady("metadata is not loaded")

        out: dict[int, dict[str, Any]] = {}
        with open(self._meta_path, "rb") as handle:
            for row in sorted(rows):
                start = int(self._offsets[row])
                length = int(self._offsets[row + 1]) - start
                handle.seek(start)
                out[row] = json.loads(handle.read(length))
        return out

    def tmdb_id(self, row: int) -> int:
        assert self._ids is not None
        return int(self._ids[row])

    # ── public API ─────────────────────────────────────────────────────────

    def recommend(
        self,
        synopsis: str,
        genre: str | None = None,
        year: int | None = None,
        title: str | None = None,
        top_k: int = 10,
    ) -> dict[str, Any]:
        soup = build_soup(
            title=title,
            overview=synopsis,
            genres=split_genres(genre),
            year=year,
        )
        if len(soup.strip()) < 10:
            raise ValueError("synopsis must be at least 10 characters")

        hits = self.search(self.encode(soup), top_k)
        meta = self.metadata([row for row, _ in hits])

        recommendations = []
        for row, score in hits:
            entry = meta.get(row, {})
            recommendations.append(
                {
                    "movie_id": self.tmdb_id(row),
                    "similarity_score": max(0.0, min(1.0, score)),
                    "title": entry.get("t"),
                    "overview": None,
                    "year": entry.get("y"),
                    "poster_path": entry.get("p"),
                    "genres_list": entry.get("g") or [],
                }
            )

        return {"query": soup, "recommendations": recommendations, "count": len(recommendations)}


# ── metadata soup ──────────────────────────────────────────────────────────

def split_genres(genre: str | None) -> list[str]:
    if not genre:
        return []
    return [part.strip() for part in genre.split(",") if part.strip()]


def build_soup(
    title: str | None = None,
    overview: str | None = None,
    genres: Iterable[str] | None = None,
    directors: Iterable[str] | None = None,
    studios: Iterable[str] | None = None,
    countries: Iterable[str] | None = None,
    year: int | None = None,
    keywords: Iterable[str] | None = None,
) -> str:
    """
    Rebuild the exact training-time text format. Field order and the per-field
    caps matter: the indexed vectors were produced from this layout, so any
    deviation moves the query away from its own neighbourhood.

        Keyword (5) . Genre (3) . Director (2) . Studio (2) . Country (1) .
        Year . Title . Overview
    """
    parts: list[str] = []

    def extend(label: str, values: Iterable[str] | None, limit: int) -> None:
        for value in list(values or [])[:limit]:
            if value and str(value).strip():
                parts.append(f"{label}: {str(value).strip()}")

    extend("Keyword", keywords, 5)
    extend("Genre", genres, 3)
    extend("Director", directors, 2)
    extend("Studio", studios, 2)
    extend("Country", countries, 1)

    if year:
        parts.append(f"Year: {year}")
    if title and title.strip():
        parts.append(f"Title: {title.strip()}")
    if overview and overview.strip():
        parts.append(f"Overview: {overview.strip()}")

    return ". ".join(parts)


def _classify_input(name: str) -> str:
    lowered = name.lower()
    if "token_type" in lowered or "segment" in lowered:
        return "token_type"
    if "input_ids" in lowered or lowered == "ids":
        return "ids"
    if "attention" in lowered or "mask" in lowered:
        return "mask"
    return "unknown"


# ── lazy singleton ─────────────────────────────────────────────────────────

_engine: SemanticEngine | None = None
_engine_error: str | None = None
_lock = threading.Lock()


def get_engine() -> SemanticEngine:
    """Load once per warm instance; a cold start pays ~1s, later requests pay none."""
    global _engine, _engine_error

    if _engine is not None:
        return _engine
    if _engine_error is not None:
        raise EngineNotReady(_engine_error)

    with _lock:
        if _engine is not None:
            return _engine
        if _engine_error is not None:
            raise EngineNotReady(_engine_error)
        try:
            engine = SemanticEngine()
            engine.load()
            _engine = engine
        except Exception as exc:  # noqa: BLE001 - surfaced through /health
            _engine_error = f"{type(exc).__name__}: {exc}"
            raise EngineNotReady(_engine_error) from exc

    return _engine
