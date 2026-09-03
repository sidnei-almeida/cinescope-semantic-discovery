import { useEffect, useState } from "react";
import HeroOrnamentStar from "./HeroOrnamentStar.jsx";
import SearchHero from "./SearchHero.jsx";
import { buildTmdbImageUrl } from "../services/tmdbApi.js";
import {
  BACKDROP_SIZE_HERO,
  BACKDROP_SIZE_HERO_WIDE,
  HERO_ORIGINAL_MIN_WIDTH,
} from "../config/constants.js";

/** Re-evaluated on resize so a window moved to a large display upgrades. */
function useHeroBackdropSize() {
  const [size, setSize] = useState(BACKDROP_SIZE_HERO);

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${HERO_ORIGINAL_MIN_WIDTH}px)`);
    const apply = () =>
      setSize(query.matches ? BACKDROP_SIZE_HERO_WIDE : BACKDROP_SIZE_HERO);

    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return size;
}

export default function HeroSection({
  onSearch,
  onSelectMovie,
  disabled,
  backdropPath,
  backdropUrl,
}) {
  const size = useHeroBackdropSize();
  // Prefer building from the path so the hero controls its own resolution;
  // fall back to whatever URL the caller already resolved.
  const background = buildTmdbImageUrl(backdropPath, size) || backdropUrl;

  return (
    <section className="hero-section" id="discover">
      {/*
        The hero borrows the spotlight film's own backdrop. Before a film is
        loaded there is no photograph at all — the previous fallback was a
        10 MB PNG that every visitor downloaded to look at for one second.
      */}
      <div className="hero-glow" aria-hidden />
      {background && (
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${background})` }}
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
