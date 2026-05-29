import HeroOrnamentStar from "./HeroOrnamentStar.jsx";
import SearchHero from "./SearchHero.jsx";

const HERO_BACKGROUND = "/hero_image.png";

export default function HeroSection({ onSearch, onSelectMovie, disabled }) {
  return (
    <section className="hero-section" id="discover">
      <div
        className="hero-bg"
        style={{ backgroundImage: `url(${HERO_BACKGROUND})` }}
        aria-hidden
      />
      <div className="hero-vignette" aria-hidden />

      <div className="hero-content">
        <h1 className="hero-title">CineScope Intelligence</h1>

        <div className="hero-ornament" aria-hidden>
          <span className="hero-ornament-line" />
          <HeroOrnamentStar size={18} className="hero-ornament-star" />
          <span className="hero-ornament-line" />
        </div>

        <p className="hero-subtitle">
          Understand cinema. Discover stories that resonate.
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
