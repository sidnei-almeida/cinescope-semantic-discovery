/** Facts from tmdb-semantic-recommender — used in informational UI only. */

export const API_NAME = "TMDB Semantic Recommender API";
export const API_ENDPOINT = "POST /api/v1/recommend";

export const TECH_METRICS = [
  { label: "30k Movies", hint: "Approximate indexed library size." },
  { label: "INT8 ONNX", hint: "Quantized semantic model for efficient inference." },
  { label: "Annoy Index", hint: "Approximate nearest-neighbor vector search." },
  { label: "Context-Aware", hint: "Genre, year, title, and overview are embedded together." },
  { label: "FastAPI", hint: "REST API with health checks and documentation." },
  { label: "TMDb Enriched", hint: "Movie visuals, cast, trailers, and metadata." },
];

export const MODEL_FEATURES = [
  {
    title: "ONNX Semantic Embeddings",
    text: "Uses an INT8-quantized all-MiniLM-L6-v2 model through ONNX Runtime for efficient embedding generation.",
  },
  {
    title: "Context-Aware Input",
    text: 'Combines genre, year, title, and overview into a richer semantic query before recommendation.',
  },
  {
    title: "Vector Similarity Search",
    text: "Searches an Annoy index of roughly 30,000 movies to retrieve nearest semantic matches.",
  },
  {
    title: "Similarity Scores",
    text: "Returns ranked movie candidates with similarity scores that the interface uses as part of the recommendation experience.",
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
    title: "Fallback Discovery",
    text: "TMDb search can complement semantic recommendations when the model returns too few visual candidates.",
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
    text: "FastAPI endpoint generates embeddings and searches the Annoy vector index.",
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
  "ONNX Runtime",
  "all-MiniLM-L6-v2",
  "Annoy Vector Search",
  "TMDb API",
  "Semantic Search",
  "Recommendation Ranking",
];
