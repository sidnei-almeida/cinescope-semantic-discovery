"""
BERT WordPiece tokenizer, pure Python.

The `tokenizers` package would do this in Rust, but it depends on
`huggingface_hub`, which drags `hf_xet`, `requests`, `fsspec` and `pyyaml` into
the deployment — roughly 30 MB of a Hub client that a serverless function with a
local vocab file never calls. Since the encoder only ever tokenizes one short
string per request, the Rust speed is irrelevant and the dependency is not.

This mirrors `BertNormalizer` + `BertPreTokenizer` + `WordPiece` exactly as
configured in the model's tokenizer.json:

    normalizer     clean_text, handle_chinese_chars, lowercase, strip accents
    pre-tokenizer  whitespace and punctuation splits
    model          WordPiece, "##" continuation prefix, [UNK], 100-char cap
    post-process   [CLS] ... [SEP], truncated to 128, right-padded with [PAD]

`scripts/check_tokenizer.py` asserts token-for-token parity against the
reference implementation.
"""
from __future__ import annotations

import unicodedata
from pathlib import Path

MAX_LENGTH = 128
MAX_CHARS_PER_WORD = 100
CONTINUATION_PREFIX = "##"

# Unicode blocks that BERT treats as one token per character.
_CJK_RANGES = (
    (0x4E00, 0x9FFF),
    (0x3400, 0x4DBF),
    (0x20000, 0x2A6DF),
    (0x2A700, 0x2B73F),
    (0x2B740, 0x2B81F),
    (0x2B820, 0x2CEAF),
    (0xF900, 0xFAFF),
    (0x2F800, 0x2FA1F),
)


def _is_chinese_char(code: int) -> bool:
    return any(start <= code <= end for start, end in _CJK_RANGES)


def _is_whitespace(char: str) -> bool:
    if char in (" ", "\t", "\n", "\r"):
        return True
    return unicodedata.category(char) == "Zs"


def _is_control(char: str) -> bool:
    if char in ("\t", "\n", "\r"):
        return False
    return unicodedata.category(char).startswith("C")


def _is_punctuation(char: str) -> bool:
    code = ord(char)
    if 33 <= code <= 47 or 58 <= code <= 64 or 91 <= code <= 96 or 123 <= code <= 126:
        return True
    return unicodedata.category(char).startswith("P")


def _normalize(text: str) -> str:
    """clean_text, then handle_chinese_chars, then strip accents, then lowercase."""
    cleaned: list[str] = []
    for char in text:
        code = ord(char)
        if code == 0 or code == 0xFFFD or _is_control(char):
            continue
        if _is_whitespace(char):
            cleaned.append(" ")
        elif _is_chinese_char(code):
            cleaned.append(f" {char} ")
        else:
            cleaned.append(char)

    decomposed = unicodedata.normalize("NFD", "".join(cleaned))
    stripped = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    return stripped.lower()


def _pre_tokenize(text: str) -> list[str]:
    """Split on whitespace, then peel punctuation into standalone tokens."""
    tokens: list[str] = []
    for word in text.split():
        current = ""
        for char in word:
            if _is_punctuation(char):
                if current:
                    tokens.append(current)
                    current = ""
                tokens.append(char)
            else:
                current += char
        if current:
            tokens.append(current)
    return tokens


class BertWordPieceTokenizer:
    def __init__(self, vocab_path: Path):
        self.vocab: dict[str, int] = {}
        with open(vocab_path, encoding="utf-8") as handle:
            for index, line in enumerate(handle):
                self.vocab[line.rstrip("\n")] = index

        self.unk_id = self.vocab["[UNK]"]
        self.cls_id = self.vocab["[CLS]"]
        self.sep_id = self.vocab["[SEP]"]
        self.pad_id = self.vocab["[PAD]"]

    def _word_piece(self, word: str) -> list[int]:
        if len(word) > MAX_CHARS_PER_WORD:
            return [self.unk_id]

        pieces: list[int] = []
        start = 0
        while start < len(word):
            end = len(word)
            match = None
            while start < end:
                candidate = word[start:end]
                if start > 0:
                    candidate = CONTINUATION_PREFIX + candidate
                if candidate in self.vocab:
                    match = self.vocab[candidate]
                    break
                end -= 1
            if match is None:
                # A single unmatched piece invalidates the whole word.
                return [self.unk_id]
            pieces.append(match)
            start = end
        return pieces

    def encode(self, text: str) -> tuple[list[int], list[int]]:
        """Returns (input_ids, attention_mask), both padded to MAX_LENGTH."""
        ids: list[int] = []
        # Two slots are reserved for [CLS] and [SEP], matching how the reference
        # tokenizer subtracts the post-processor's added tokens before truncating.
        budget = MAX_LENGTH - 2

        for word in _pre_tokenize(_normalize(text)):
            if len(ids) >= budget:
                break
            ids.extend(self._word_piece(word))

        ids = [self.cls_id] + ids[:budget] + [self.sep_id]

        attention_mask = [1] * len(ids)
        padding = MAX_LENGTH - len(ids)
        if padding > 0:
            ids.extend([self.pad_id] * padding)
            attention_mask.extend([0] * padding)

        return ids, attention_mask
