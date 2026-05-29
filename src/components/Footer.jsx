import { GITHUB_REPO_URL, PORTFOLIO_URL } from "../config/siteLinks.js";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-mark" aria-hidden />
          <div>
            <strong>CineScope Intelligence</strong>
            <span>Semantic movie discovery</span>
          </div>
        </div>

        <div className="footer-meta">
          <span>Data courtesy of TMDb</span>
          <span>
            This product uses the TMDb API but is not endorsed or certified by TMDb.
          </span>
        </div>

        <div className="footer-links">
          <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">
            Portfolio
          </a>
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
