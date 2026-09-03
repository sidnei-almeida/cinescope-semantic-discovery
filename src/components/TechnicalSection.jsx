import ApiConsole from "./ApiConsole.jsx";
import { INDEXED_MOVIES_LABEL } from "../config/projectFacts.js";

const STACK_TAGS = [
  "BERT embeddings",
  "ONNX inference",
  "Exact vector search",
  "TMDb metadata",
  "FastAPI on Vercel",
  "React / Vite frontend",
];

export default function TechnicalSection() {
  return (
    <section className="technical-section" id="api">
      <div className="technical-shell">
        <div className="technical-copy">
          <span className="technical-eyebrow">For Developers</span>
          <h2 className="technical-title">Built for semantic movie discovery</h2>
          <p className="technical-lead">
            Semantic recommendations are served by a FastAPI function deployed with this
            site — a quantized MiniLM encoder plus an exact cosine scan over the full
            index. The frontend enriches and ranks those results with TMDb.
          </p>

          <div className="technical-metric" aria-label="Indexed library size">
            <span className="technical-metric__value">{INDEXED_MOVIES_LABEL}</span>
            <span className="technical-metric__label">movies indexed</span>
          </div>
        </div>

        <ApiConsole stackTags={STACK_TAGS} />
      </div>
    </section>
  );
}
