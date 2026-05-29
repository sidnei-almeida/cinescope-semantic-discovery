import ApiConsole from "./ApiConsole.jsx";

const STACK = [
  "BERT embeddings",
  "ONNX inference",
  "Annoy vector search",
  "TMDb metadata",
  "FastAPI recommender",
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
            Production-ready retrieval with hybrid re-ranking on the client.
          </p>

          <div className="tech-stack-grid">
            {STACK.map((item) => (
              <span key={item} className="tech-stack-chip">
                {item}
              </span>
            ))}
          </div>
        </div>

        <ApiConsole />
      </div>
    </section>
  );
}
