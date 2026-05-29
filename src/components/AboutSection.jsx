import { STACK_CHIPS, TECH_METRICS } from "../config/projectFacts.js";
import {
  API_REPO_URL,
  GITHUB_REPO_URL,
  PORTFOLIO_URL,
} from "../config/siteLinks.js";
import InfoMetricStrip from "./info/InfoMetricStrip.jsx";

export default function AboutSection() {
  return (
    <section
      id="about"
      className="info-section info-section--about"
      aria-labelledby="about-title"
    >
      <span className="info-section-eyebrow">Project</span>
      <h2 id="about-title" className="info-section-title">
        About CineScope Intelligence
      </h2>
      <p className="info-section-lead">
        CineScope Intelligence is a portfolio AI product that turns a semantic movie
        recommendation API into a cinematic discovery interface. The project combines a
        FastAPI/ONNX recommendation backend with a React front-end, TMDb metadata
        enrichment, recommendation source badges, spotlight movie previews, trailer
        playback, and a filterable results grid.
      </p>
      <p className="info-section-secondary">
        The backend focuses on meaning-based retrieval using context-aware embeddings and
        vector search. The frontend focuses on product experience: discovery, explainability,
        enrichment, visual hierarchy, and cinematic presentation.
      </p>

      <InfoMetricStrip metrics={TECH_METRICS} />

      <div className="info-chip-grid" role="list" aria-label="Technology stack">
        {STACK_CHIPS.map((item) => (
          <span key={item} className="info-chip" role="listitem">
            {item}
          </span>
        ))}
      </div>

      <div className="about-links">
        <a href="#discover">Live Demo</a>
        <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={API_REPO_URL} target="_blank" rel="noreferrer">
          API Repo
        </a>
        <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">
          Portfolio
        </a>
      </div>
    </section>
  );
}
