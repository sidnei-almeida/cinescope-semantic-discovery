/**
 * BERT WordPiece tokenizer.
 *
 * A direct port of the pipeline configured in the model's tokenizer.json:
 *
 *     normalizer     clean_text, handle_chinese_chars, strip accents, lowercase
 *     pre-tokenizer  whitespace and punctuation splits
 *     model          WordPiece, "##" continuation prefix, [UNK], 100-char cap
 *     post-process   [CLS] ... [SEP], truncated to 128, right-padded with [PAD]
 *
 * The index was built with the reference tokenizer, so any drift here moves
 * every query vector away from its own neighbourhood. `npm run check:tokenizer`
 * asserts token-for-token parity against a fixture generated from it.
 */
import fs from "node:fs";

export const MAX_LENGTH = 128;
const MAX_CHARS_PER_WORD = 100;
const CONTINUATION_PREFIX = "##";

// Unicode blocks BERT treats as one token per character.
const CJK_RANGES = [
  [0x4e00, 0x9fff],
  [0x3400, 0x4dbf],
  [0x20000, 0x2a6df],
  [0x2a700, 0x2b73f],
  [0x2b740, 0x2b81f],
  [0x2b820, 0x2ceaf],
  [0xf900, 0xfaff],
  [0x2f800, 0x2fa1f],
];

const CONTROL = /\p{C}/u;
const SPACE_SEPARATOR = /\p{Zs}/u;
const PUNCTUATION = /\p{P}/u;
const COMBINING_MARK = /\p{Mn}/gu;

function isChineseChar(code) {
  for (const [start, end] of CJK_RANGES) {
    if (code >= start && code <= end) return true;
  }
  return false;
}

function isWhitespace(char) {
  return char === " " || char === "\t" || char === "\n" || char === "\r" || SPACE_SEPARATOR.test(char);
}

function isControl(char) {
  if (char === "\t" || char === "\n" || char === "\r") return false;
  return CONTROL.test(char);
}

function isPunctuation(char) {
  const code = char.codePointAt(0);
  if (
    (code >= 33 && code <= 47) ||
    (code >= 58 && code <= 64) ||
    (code >= 91 && code <= 96) ||
    (code >= 123 && code <= 126)
  ) {
    return true;
  }
  return PUNCTUATION.test(char);
}

/** clean_text, then handle_chinese_chars, then strip accents, then lowercase. */
function normalize(text) {
  let cleaned = "";
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code === 0 || code === 0xfffd || isControl(char)) continue;
    if (isWhitespace(char)) cleaned += " ";
    else if (isChineseChar(code)) cleaned += ` ${char} `;
    else cleaned += char;
  }
  return cleaned.normalize("NFD").replace(COMBINING_MARK, "").toLowerCase();
}

/** Split on whitespace, then peel punctuation into standalone tokens. */
function preTokenize(text) {
  const tokens = [];
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    let current = "";
    for (const char of word) {
      if (isPunctuation(char)) {
        if (current) {
          tokens.push(current);
          current = "";
        }
        tokens.push(char);
      } else {
        current += char;
      }
    }
    if (current) tokens.push(current);
  }
  return tokens;
}

export class BertWordPieceTokenizer {
  constructor(vocabPath) {
    this.vocab = new Map();
    const lines = fs.readFileSync(vocabPath, "utf8").split("\n");
    // A trailing newline yields one empty final entry, which is not a token.
    const count = lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
    for (let i = 0; i < count; i++) this.vocab.set(lines[i], i);

    this.unkId = this.vocab.get("[UNK]");
    this.clsId = this.vocab.get("[CLS]");
    this.sepId = this.vocab.get("[SEP]");
    this.padId = this.vocab.get("[PAD]");
  }

  #wordPiece(word) {
    const chars = [...word];
    if (chars.length > MAX_CHARS_PER_WORD) return [this.unkId];

    const pieces = [];
    let start = 0;
    while (start < chars.length) {
      let end = chars.length;
      let match = null;
      while (start < end) {
        let candidate = chars.slice(start, end).join("");
        if (start > 0) candidate = CONTINUATION_PREFIX + candidate;
        const id = this.vocab.get(candidate);
        if (id !== undefined) {
          match = id;
          break;
        }
        end -= 1;
      }
      // A single unmatched piece invalidates the whole word.
      if (match === null) return [this.unkId];
      pieces.push(match);
      start = end;
    }
    return pieces;
  }

  /** Returns { ids, attentionMask }, both padded to MAX_LENGTH. */
  encode(text) {
    const ids = [];
    // Two slots are reserved for [CLS] and [SEP], matching how the reference
    // tokenizer subtracts the post-processor's added tokens before truncating.
    const budget = MAX_LENGTH - 2;

    for (const word of preTokenize(normalize(text))) {
      if (ids.length >= budget) break;
      ids.push(...this.#wordPiece(word));
    }

    const body = ids.slice(0, budget);
    const tokens = [this.clsId, ...body, this.sepId];
    const attentionMask = new Array(tokens.length).fill(1);

    while (tokens.length < MAX_LENGTH) {
      tokens.push(this.padId);
      attentionMask.push(0);
    }

    return { ids: tokens, attentionMask };
  }
}
