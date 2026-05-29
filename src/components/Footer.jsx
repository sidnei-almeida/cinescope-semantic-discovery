const PORTFOLIO_URL = "https://sidnei-almeida.github.io";
const GITHUB_URL = "https://github.com/sidnei-almeida";

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
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
