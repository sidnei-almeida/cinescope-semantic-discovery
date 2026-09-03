import HeroOrnamentStar from "./HeroOrnamentStar.jsx";
import SearchHero from "./SearchHero.jsx";

export default function HeroSection({
  onSearch,
  onSelectMovie,
  disabled,
  backdropUrl,
}) {
  return (
    <section className="hero-section" id="discover">
      {/*
        The hero borrows the spotlight film's own backdrop. Before a film is
        loaded there is no photograph at all — the previous fallback was a
        10 MB PNG that every visitor downloaded to look at for one second.
      */}
      <div className="hero-glow" aria-hidden />
      {backdropUrl && (
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${backdropUrl})` }}
          aria-hidden
        />
      )}
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
