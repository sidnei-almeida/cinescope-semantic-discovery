#!/usr/bin/env python3
"""
Freeze the reference tokenizer's output into a fixture the JS test can check.

The runtime tokenizer is now JavaScript, so the Python `tokenizers` package is
no longer a dependency of anything that ships. Rather than require it to run the
parity test, this script records what the reference produces once; the fixture
is committed and `scripts/check_tokenizer.mjs` asserts against it.

Re-run only when the model or its tokenizer.json changes:

    pip install tokenizers
    python scripts/gen_tokenizer_fixture.py
"""
import json
import random
from pathlib import Path

from tokenizers import Tokenizer

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "api" / "model"
REFERENCE = ROOT / "scripts" / "reference" / "tokenizer.json"
FIXTURE = ROOT / "scripts" / "reference" / "tokenizer_fixture.json"

SAMPLE_SIZE = 900

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
    corpus = list(EDGE_CASES)

    with open(MODEL_DIR / "meta.jsonl", encoding="utf-8") as handle:
        rows = handle.readlines()

    random.seed(0)
    for line in random.sample(rows, min(SAMPLE_SIZE, len(rows))):
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


def main() -> None:
    tokenizer = Tokenizer.from_file(str(REFERENCE))

    cases = []
    for text in build_corpus():
        encoding = tokenizer.encode(text)
        length = sum(encoding.attention_mask)
        # Padding is implied by the length, so only the real tokens are stored.
        cases.append({"text": text, "ids": encoding.ids[:length]})

    FIXTURE.write_text(
        json.dumps({"maxLength": 128, "cases": cases}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"wrote {len(cases)} cases to {FIXTURE.relative_to(ROOT)}")
    print(f"size: {FIXTURE.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
