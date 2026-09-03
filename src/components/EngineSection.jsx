import { API_ENDPOINT, WORKFLOW_STEPS } from "../config/projectFacts.js";
import { API_REPO_URL } from "../config/siteLinks.js";
import InfoDetailList from "./info/InfoDetailList.jsx";

const PIPELINE_STEPS = [
  "Query",
  "Context Builder",
  "Semantic API",
  "TMDb Enrichment",
  "Ranked Results",
];

export default function EngineSection() {
  return (
    <section className="info-section" id="workflow" aria-labelledby="workflow-title">
      <header className="info-section__head">
        <span className="info-section-eyebrow">CineScope engine</span>
        <h2 id="workflow-title" className="info-section-title">
          Recommendation workflow
        </h2>
      </header>

      <div className="info-section__body">
        <p className="info-section-lead">
          A search is first turned into movie context. CineScope posts synopsis, genre,
          year, title, and <code>top_k</code> to <code>{API_ENDPOINT}</code> — a Python
          serverless function running next to this bundle. It embeds the query with a
          quantized MiniLM encoder, scans every indexed vector for the exact nearest
          neighbours, and returns ranked candidates. The front-end then enriches them with
          TMDb details, merges complementary results, removes duplicates, and renders the
          discovery grid.
        </p>

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

        <InfoDetailList items={WORKFLOW_STEPS} className="engine-detail-list" />

        <a
          className="engine-api-repo-link"
          href={API_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          View API repository
        </a>
      </div>
    </section>
  );
}
