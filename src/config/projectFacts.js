/** Facts about the semantic engine that ships in api/. Used in informational UI only. */

export const API_NAME = "CineScope Semantic Recommender";
export const API_ENDPOINT = "POST /api/v1/recommend";

export const INDEXED_MOVIES = 62368;
export const INDEXED_MOVIES_LABEL = "62,368";
export const EMBEDDING_DIM = 384;

export const TECH_METRICS = [
  { label: `${INDEXED_MOVIES_LABEL} Movies`, hint: "Every title in the semantic index." },
  { label: "INT8 ONNX", hint: "Quantized MiniLM encoder, ~23 MB, CPU inference." },
  { label: "Exact Cosine", hint: "Brute-force search over the full index — no approximation." },
  { label: "Context-Aware", hint: "Genre, year, title, and overview are embedded together." },
  { label: "Serverless", hint: "Python function deployed alongside the frontend." },
  { label: "TMDb Enriched", hint: "Movie visuals, cast, trailers, and metadata." },
];

export const MODEL_FEATURES = [
  {
    title: "ONNX Semantic Embeddings",
    text: "An INT8-quantized all-MiniLM-L6-v2 runs on ONNX Runtime and turns movie context into a 384-dimensional vector in about 25 ms.",
  },
  {
    title: "Context-Aware Input",
    text: "Genre, year, title, and overview are folded into a single structured prompt, so the same word carries different meaning across genres.",
  },
  {
    title: "Exact Vector Search",
    text: `All ${INDEXED_MOVIES_LABEL} movie vectors are stored as a quantized int8 matrix and scanned in full on every query — the nearest neighbours are exact, not approximated.`,
  },
  {
    title: "Similarity Scores",
    text: "Each candidate comes back with its cosine similarity, which the interface reuses when ranking and explaining a match.",
  },
];

export const DATA_FEATURES = [
  {
    title: "Movie Identity",
    text: "The API returns TMDb-compatible movie_id values, allowing the front-end to fetch complete movie details.",
  },
  {
    title: "Visual Metadata",
    text: "Posters, backdrops, and cast portraits turn semantic matches into a polished cinematic experience.",
  },
  {
    title: "Trailers & Credits",
    text: "TMDb details, credits, and videos power the spotlight feature and trailer playback.",
  },
  {
    title: "Complementary Discovery",
    text: "TMDb discovery results complement the semantic candidates when the model returns too few visual matches.",
  },
];

export const WORKFLOW_STEPS = [
  {
    title: "Query",
    text: "Natural language, title search, mood, theme, or story context.",
  },
  {
    title: "Context Builder",
    text: "Builds a recommendation payload with synopsis, genre, year, title, and top_k.",
  },
  {
    title: "Semantic API",
    text: "The serverless function embeds the query and scans the full int8 vector index for exact nearest neighbours.",
  },
  {
    title: "TMDb Enrichment",
    text: "Fetches posters, cast, trailers, metadata, and ratings.",
  },
  {
    title: "Ranked Discovery",
    text: "Merges semantic and TMDb candidates, removes duplicates, and displays filtered results.",
  },
];

export const STACK_CHIPS = [
  "React",
  "Vite",
  "FastAPI",
  "Vercel Functions",
  "ONNX Runtime",
  "all-MiniLM-L6-v2",
  "NumPy Vector Search",
  "TMDb API",
  "Semantic Search",
];
