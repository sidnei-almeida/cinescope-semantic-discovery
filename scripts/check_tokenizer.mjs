/**
 * Assert api/_tokenizer.js matches the reference tokenizer.
 *
 * The fixture was produced by scripts/gen_tokenizer_fixture.py from the same
 * tokenizer.json the index was built with. A mismatch here means query vectors
 * land somewhere other than where the indexed vectors were computed, which
 * degrades every recommendation without throwing an error anywhere.
 *
 *     npm run check:tokenizer
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BertWordPieceTokenizer, MAX_LENGTH } from "../api/_tokenizer.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, "reference", "tokenizer_fixture.json");
const vocabPath = path.join(here, "..", "api", "model", "vocab.txt");

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const tokenizer = new BertWordPieceTokenizer(vocabPath);

const mismatches = [];

for (const { text, ids: expected } of fixture.cases) {
  const { ids, attentionMask } = tokenizer.encode(text);

  const length = attentionMask.reduce((total, bit) => total + bit, 0);
  const actual = ids.slice(0, length);

  const same =
    ids.length === MAX_LENGTH &&
    actual.length === expected.length &&
    actual.every((id, i) => id === expected[i]);

  if (!same) mismatches.push({ text, expected, actual });
}

console.log(`checked ${fixture.cases.length} strings`);

if (mismatches.length > 0) {
  console.error(`MISMATCH on ${mismatches.length}:`);
  for (const { text, expected, actual } of mismatches.slice(0, 5)) {
    console.error(`  ${JSON.stringify(text.slice(0, 110))}`);
    console.error(`    expected ${expected.slice(0, 24).join(", ")}`);
    console.error(`    got      ${actual.slice(0, 24).join(", ")}`);
  }
  process.exit(1);
}

console.log("all encodings match the reference tokenizer");
