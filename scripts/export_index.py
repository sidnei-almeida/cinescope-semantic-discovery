#!/usr/bin/env python3
"""
Export the Annoy index + movies map into a Vercel-friendly artifact set.

The original engine shipped a 132 MB Annoy index and the `annoy` C++ extension,
neither of which fits a Vercel Python function. This script reads the Annoy file
directly (no `annoy` dependency), pulls out the 62k item vectors and writes a
compact int8 matrix that supports exact brute-force cosine search with numpy.

Annoy angular node layout (annoylib.h):

    struct Node {
        int32 n_descendants;
        union { int32 children[2]; float norm; };
        float v[f];
    }

so every node occupies `12 + 4 * f` bytes and the first `n_items` nodes are the
items themselves, in insertion order.

Usage:
    python scripts/export_index.py --ann movies.ann --map movies_map.pkl --out api/model
"""
import argparse
import json
import os
import pickle
import struct
from pathlib import Path

import numpy as np

DIM = 384
NODE_HEADER = 12  # int32 n_descendants + 8-byte union
NODE_SIZE = NODE_HEADER + DIM * 4


def read_item_vectors(ann_path: Path, n_items: int) -> np.ndarray:
    total = ann_path.stat().st_size
    if total % NODE_SIZE:
        raise ValueError(
            f"{ann_path} is not a {DIM}-dimensional angular Annoy index "
            f"(size {total} is not a multiple of {NODE_SIZE})"
        )

    raw = np.memmap(ann_path, dtype=np.uint8, mode="r")
    nodes = raw[: n_items * NODE_SIZE].reshape(n_items, NODE_SIZE)

    descendants = nodes[:, :4].copy().view(np.int32).ravel()
    if not np.all(descendants == 1):
        bad = int(np.flatnonzero(descendants != 1)[0])
        raise ValueError(f"node {bad} is not an item node (n_descendants != 1)")

    vectors = nodes[:, NODE_HEADER:].copy().view(np.float32).reshape(n_items, DIM)
    return vectors


def quantize_int8(vectors: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per-row symmetric int8 quantization. Returns (codes, scales)."""
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    unit = vectors / norms

    scales = np.abs(unit).max(axis=1) / 127.0
    scales[scales == 0] = 1.0
    codes = np.rint(unit / scales[:, None]).clip(-127, 127).astype(np.int8)
    return codes, scales.astype(np.float32)


def report_quantization_error(vectors: np.ndarray, codes: np.ndarray, scales: np.ndarray) -> None:
    sample = np.random.default_rng(0).choice(len(vectors), size=min(2000, len(vectors)), replace=False)
    original = vectors[sample]
    original /= np.linalg.norm(original, axis=1, keepdims=True)
    restored = codes[sample].astype(np.float32) * scales[sample][:, None]
    cos = np.sum(original * restored, axis=1) / np.linalg.norm(restored, axis=1)
    print(f"  quantization cosine fidelity: min={cos.min():.6f} mean={cos.mean():.6f}")


def write_metadata(movies_map: dict, out_dir: Path, n_items: int) -> np.ndarray:
    """Write JSONL rows plus an offset table so the API can seek to a single movie."""
    ids = np.zeros(n_items, dtype=np.int32)
    offsets = np.zeros(n_items + 1, dtype=np.int64)

    with open(out_dir / "meta.jsonl", "wb") as handle:
        for i in range(n_items):
            entry = movies_map.get(i) or {}
            tmdb_id = entry.get("tmdb_id")
            ids[i] = int(tmdb_id) if tmdb_id is not None else -1

            year = entry.get("year")
            try:
                year = int(year)
            except (TypeError, ValueError):
                year = None

            row = {
                "t": entry.get("title"),
                "y": year,
                "p": entry.get("poster_path"),
                "g": entry.get("genres_list") or [],
            }
            line = json.dumps(row, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
            handle.write(line)
            offsets[i + 1] = offsets[i] + len(line)

    (out_dir / "ids.i32.bin").write_bytes(ids.tobytes())
    (out_dir / "meta.offsets.i64.bin").write_bytes(offsets.tobytes())
    return ids


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ann", required=True, type=Path)
    parser.add_argument("--map", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    with open(args.map, "rb") as handle:
        movies_map = pickle.load(handle)

    keys = sorted(movies_map.keys())
    n_items = keys[-1] + 1
    if len(keys) != n_items:
        raise ValueError(f"movies map is sparse: {len(keys)} entries but max id {keys[-1]}")
    print(f"movies map: {n_items} entries")

    vectors = read_item_vectors(args.ann, n_items)
    print(f"vectors: {vectors.shape}, mean norm {np.linalg.norm(vectors, axis=1).mean():.6f}")

    codes, scales = quantize_int8(vectors)
    report_quantization_error(vectors, codes, scales)

    (args.out / "embeddings.i8.bin").write_bytes(codes.tobytes())
    (args.out / "scales.f32.bin").write_bytes(scales.tobytes())
    ids = write_metadata(movies_map, args.out, n_items)

    manifest = {
        "count": int(n_items),
        "dim": DIM,
        "dtype": "int8",
        "quantization": "per-row-symmetric",
        "source_index": args.ann.name,
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    print(f"unique tmdb ids: {len(set(ids.tolist()))}")
    print("\nwritten to", args.out.resolve())
    for path in sorted(args.out.iterdir()):
        print(f"  {path.name:28s} {path.stat().st_size / 1024 / 1024:8.2f} MB")


if __name__ == "__main__":
    main()
