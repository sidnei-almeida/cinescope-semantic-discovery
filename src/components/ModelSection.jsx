import {
  API_ENDPOINT,
  API_NAME,
  MODEL_FEATURES,
  TECH_METRICS,
} from "../config/projectFacts.js";
import InfoFeatureGrid from "./info/InfoFeatureGrid.jsx";
import InfoMetricStrip from "./info/InfoMetricStrip.jsx";

export default function ModelSection() {
  return (
    <section id="model" className="info-section" aria-labelledby="model-title">
      <span className="info-section-eyebrow">Model intelligence</span>
      <h2 id="model-title" className="info-section-title">
        Semantic Recommendation Model
      </h2>
      <p className="info-section-lead">
        CineScope is powered by the <strong>{API_NAME}</strong> — a FastAPI semantic
        recommendation engine that converts movie context into dense embeddings using an
        ONNX-optimized <code>all-MiniLM-L6-v2</code> model. Instead of matching only
        keywords, it compares meaning across movie synopses and retrieves the closest
        candidates from a vector index via <code>{API_ENDPOINT}</code>.
      </p>
      <p className="info-section-secondary">
        The recommender uses context-enriched input — genre, year, title, and overview — so
        the same word can be interpreted differently across genres. A &ldquo;family&rdquo;
        reference in horror, drama, or romance should not produce the same recommendation
        universe.
      </p>

      <InfoFeatureGrid items={MODEL_FEATURES} columns={2} />
      <InfoMetricStrip metrics={TECH_METRICS.slice(0, 4)} className="info-metric-strip--compact" />
    </section>
  );
}
