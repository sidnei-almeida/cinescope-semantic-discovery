import { STACK_CHIPS } from "../config/projectFacts.js";
import {
  API_REPO_URL,
  GITHUB_REPO_URL,
  PORTFOLIO_URL,
} from "../config/siteLinks.js";

const ABOUT_LINKS = [
  { label: "Live Demo", href: "/", external: false },
  { label: "GitHub", href: GITHUB_REPO_URL, external: true },
  { label: "API Repo", href: API_REPO_URL, external: true },
  { label: "Portfolio", href: PORTFOLIO_URL, external: true },
];

export default function AboutSection() {
  return (
    <section
      id="about"
      className="info-section info-section--about about-section"
      aria-labelledby="about-title"
    >
      <span className="info-section-eyebrow">Project</span>
      <h2 id="about-title" className="info-section-title">
        About CineScope Intelligence
      </h2>

      <div className="about-shell">
        <div className="about-copy">
          <p className="info-section-lead">
            CineScope Intelligence is a portfolio AI product that turns a semantic movie
            recommendation API into a cinematic discovery interface. The project combines a
            FastAPI/ONNX recommendation backend with a React front-end, TMDb metadata
            enrichment, recommendation source badges, spotlight movie previews, trailer
            playback, and a filterable results grid.
          </p>
          <p className="info-section-secondary">
            The backend focuses on meaning-based retrieval using context-aware embeddings and
            vector search. The frontend focuses on product experience: discovery,
            explainability, enrichment, visual hierarchy, and cinematic presentation.
          </p>

          <div className="about-copy-divider" aria-hidden="true" />

          <nav className="about-links" aria-label="Project links">
            {ABOUT_LINKS.map(({ label, href, external }) => (
              <a
                key={label}
                href={href}
                className="about-link"
                {...(external
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                {label}
                <span className="about-link__arrow" aria-hidden>
                  →
                </span>
              </a>
            ))}
          </nav>
        </div>

        <aside className="about-stack" aria-labelledby="about-stack-label">
          <span id="about-stack-label" className="about-stack-label">
            Stack
          </span>
          <div className="about-stack-tags" role="list">
            {STACK_CHIPS.map((item) => (
              <span key={item} className="dev-tag" role="listitem">
                {item}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
