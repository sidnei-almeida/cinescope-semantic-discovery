import { SEMANTIC_MODEL_SERVICE_URL } from "../config/constants.js";
import { API_ENDPOINT } from "../config/projectFacts.js";
import { WORKFLOW_STEPS } from "../config/projectFacts.js";
import { API_REPO_URL } from "../config/siteLinks.js";
import InfoFeatureGrid from "./info/InfoFeatureGrid.jsx";

const PIPELINE_STEPS = [
  "Query",
  "Context Builder",
  "Semantic API",
  "TMDb Enrichment",
  "Ranked Results",
];

export default function EngineSection() {
  return (
    <section className="engine-section info-section--workflow" id="workflow">
      <div className="engine-strip">
        <div className="engine-strip-header">
          <span className="section-eyebrow">CineScope Engine</span>
          <h2 className="info-section-title info-section-title--inline">
            Recommendation workflow
          </h2>
          <p className="engine-strip-lead">
            A user search is first converted into movie context. CineScope sends synopsis,
            genre, year, title, and <code>top_k</code> to{" "}
            <code>{API_ENDPOINT}</code> on the{" "}
            <a
              className="engine-render-link"
              href={SEMANTIC_MODEL_SERVICE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              TMDB Semantic Recommender
            </a>
            . The API returns semantic candidates; the front-end enriches them with TMDb
            details, merges fallback results when needed, removes duplicates, and renders
            the final ranked discovery grid.
          </p>
          <a
            className="engine-api-repo-link"
            href={API_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            View API repository
          </a>
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

      <InfoFeatureGrid items={WORKFLOW_STEPS} columns={3} />
    </section>
  );
}
