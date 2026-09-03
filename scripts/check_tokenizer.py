#!/usr/bin/env python3
"""
Assert that api/_tokenizer.py matches the reference `tokenizers` implementation.

The serverless function ships a pure-Python WordPiece tokenizer so it does not
have to carry the HuggingFace Hub client. That is only safe if it produces the
exact same ids as the tokenizer the index was built with — a single token of
drift moves every query vector.

Run after changing the tokenizer or swapping the model:

    pip install tokenizers
    python scripts/check_tokenizer.py
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))

from tokenizers import Tokenizer  # noqa: E402

from _tokenizer import BertWordPieceTokenizer  # noqa: E402

MODEL_DIR = Path(__file__).resolve().parent.parent / "api" / "model"
# Kept outside api/ so the 700 KB reference file stays out of the deployed bundle.
REFERENCE_TOKENIZER = Path(__file__).resolve().parent / "reference" / "tokenizer.json"

EDGE_CASES = [
    "",
    "   ",
    "Inception",
    "Genre: Horror. Year: 2018. Title: Hereditary. Overview: A family unravels.",
    "Amélie — a naïve waitress in Montmartre; café, crème brûlée, déjà vu.",
    "Æon Flux & the ÜBER-cool ŠČ ŽĐ film",
    "千と千尋の神隠し 東京物語",
    "Кино о любви · Ταινία · فيلم",
    "hello world�controlbell",
    "punctuation!!!???...,,,;:'\"(){}[]<>@#$%^&*-_=+/\\|~`",
    "Tabs\tand\nnewlines\r\nand nbsp",
    "supercalifragilisticexpialidocious " * 4,
    "x" * 250,
    "emoji \U0001f3ac \U0001f37f test",
    "MiXeD CaSe ALLCAPS lowercase 12345 3.14 1,000",
    "ß Straße ﬁ ligature ① ② circled",
    "a" + "́" * 5 + "combining marks",
    " ".join(str(n) for n in range(400)),
]


def build_corpus() -> list[str]:
    """Edge cases plus real metadata soups built from the shipped index."""
    corpus = list(EDGE_CASES)

    with open(MODEL_DIR / "meta.jsonl", encoding="utf-8") as handle:
        rows = handle.readlines()

    random.seed(0)
    for line in random.sample(rows, min(8000, len(rows))):
        entry = json.loads(line)
        title = entry.get("t") or ""
        year = entry.get("y")
        genres = entry.get("g") or []

        parts = [f"Genre: {g}" for g in genres[:3]]
        if year:
            parts.append(f"Year: {year}")
        if title:
            parts.append(f"Title: {title}")
        parts.append(f"Overview: A story about {title.lower()} and its consequences.")
        corpus.append(". ".join(parts))
        corpus.append(title)

    return corpus


def main() -> int:
    reference = Tokenizer.from_file(str(REFERENCE_TOKENIZER))
    ours = BertWordPieceTokenizer(MODEL_DIR / "vocab.txt")

    corpus = build_corpus()
    mismatches = []

    for text in corpus:
        expected = reference.encode(text)
        ids, mask = ours.encode(text)
        if ids != expected.ids or mask != expected.attention_mask:
            mismatches.append(text)

    print(f"checked {len(corpus)} strings")
    if mismatches:
        print(f"MISMATCH on {len(mismatches)}:")
        for text in mismatches[:5]:
            print(f"  {text[:110]!r}")
            print(f"    expected {reference.encode(text).ids[:24]}")
            print(f"    got      {ours.encode(text)[0][:24]}")
        return 1

    print("all encodings match the reference tokenizer")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
