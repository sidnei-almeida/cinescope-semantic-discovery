import HeroOrnamentStar from "./HeroOrnamentStar.jsx";
import SearchHero from "./SearchHero.jsx";

/** Used until a film is in the spotlight. */
const FALLBACK_BACKDROP = "/hero_image.png";

export default function HeroSection({
  onSearch,
  onSelectMovie,
  disabled,
  backdropUrl,
}) {
  // The hero re-uses the spotlight film's backdrop, so the top of the page
  // reflects whatever the visitor is actually looking at.
  const background = backdropUrl || FALLBACK_BACKDROP;

  return (
    <section className="hero-section" id="discover">
      <div
        className="hero-bg"
        style={{ backgroundImage: `url(${background})` }}
        aria-hidden
      />
      <div className="hero-vignette" aria-hidden />
      <div className="hero-grain" aria-hidden />

      <div className="hero-content">
        <h1 className="hero-title">CineScope Intelligence</h1>

        <div className="hero-ornament" aria-hidden>
          <span className="hero-ornament-line" />
          <HeroOrnamentStar size={16} className="hero-ornament-star" />
          <span className="hero-ornament-line" />
        </div>

        <p className="hero-subtitle">
          Describe a film, a mood, or a theme. The engine searches by meaning.
        </p>

        <div className="hero-search-shell">
          <SearchHero
            onSearch={onSearch}
            onSelectMovie={onSelectMovie}
            disabled={disabled}
          />
        </div>
      </div>
    </section>
  );
}
