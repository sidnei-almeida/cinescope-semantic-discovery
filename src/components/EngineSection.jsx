import { SEMANTIC_MODEL_SERVICE_URL } from "../config/constants.js";

const PIPELINE_STEPS = [
  "Query",
  "BERT on Render",
  "TMDb Enrichment",
  "Ranked Results",
];

export default function EngineSection() {
  return (
    <section className="engine-section" id="about">
      <div className="engine-strip">
        <div className="engine-strip-header">
          <span className="section-eyebrow">CineScope Engine</span>
          <p>
            Natural-language intent → semantic retrieval on{" "}
            <a
              className="engine-render-link"
              href={SEMANTIC_MODEL_SERVICE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Render
            </a>{" "}
            → TMDb enrichment → ranked shelf.
          </p>
        </div>

        <div className="engine-pipeline" aria-label="CineScope recommendation pipeline">
          {PIPELINE_STEPS.flatMap((label, index) => {
            const items = [
              <span key={label} className="engine-pipeline-item">
                {label}
              </span>,
            ];
            if (index < PIPELINE_STEPS.length - 1) {
              items.push(
                <span key={`arrow-${label}`} className="engine-pipeline-arrow" aria-hidden>
                  →
                </span>
              );
            }
            return items;
          })}
        </div>
      </div>
    </section>
  );
}
