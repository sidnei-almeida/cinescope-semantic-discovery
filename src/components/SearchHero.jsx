import { useState, useEffect, useCallback, useRef, memo } from "react";
import clsx from "clsx";
import { Search, Loader2 } from "lucide-react";
import HeroOrnamentStar from "./HeroOrnamentStar.jsx";
import { searchMovie, getPosterUrl as tmdbPosterUrl } from "../services/tmdbApi.js";
import { getPosterUrl } from "../utils/movieFallbacks.js";
import { THUMB_SIZE } from "../config/constants.js";

const SUGGEST_DEBOUNCE_MS = 220;
const SUGGEST_MIN_CHARS = 2;

/** Exemplos editoriais — ao clicar, disparam busca semântica. */
export const QUICK_PROMPTS = [
  "mind-bending thrillers like Inception",
  "Oscar-winning dramas",
  "90s coming-of-age films",
];

const SuggestionRow = memo(function SuggestionRow({ movie, onPick }) {
  const title = movie.title || movie.name || "Untitled";
  const year = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : "—";
  const posterSrc =
    tmdbPosterUrl(movie.poster_path, THUMB_SIZE) || getPosterUrl(movie);

  return (
    <li role="option">
      <button type="button" onClick={() => onPick(movie)}>
        <img src={posterSrc} alt="" loading="lazy" decoding="async" width={34} height={51} />
        <span className="search-hero__suggestion-title">{title}</span>
        <span className="muted">{year}</span>
      </button>
    </li>
  );
});

export default function SearchHero({ onSearch, onSelectMovie, disabled }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const inputRef = useRef(null);
  const anchorRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const trimmedQuery = query.trim();
  const canSuggest = trimmedQuery.length >= SUGGEST_MIN_CHARS;
  const showPanel =
    panelOpen && canSuggest && (suggestions.length > 0 || suggestLoading);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setSuggestLoading(false);
  }, []);

  const runSuggest = useCallback(async (value) => {
    const requestId = ++requestIdRef.current;

    if (!value.trim()) {
      setSuggestions([]);
      setSuggestLoading(false);
      setPanelOpen(false);
      return;
    }

    setPanelOpen(true);
    setSuggestLoading(true);

    try {
      const results = await searchMovie(value, { limit: 6 });
      if (requestId !== requestIdRef.current) return;
      setSuggestions(results);
      setPanelOpen(results.length > 0 || value.trim().length >= SUGGEST_MIN_CHARS);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setSuggestions([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setSuggestLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!canSuggest) {
      requestIdRef.current += 1;
      setSuggestions([]);
      setSuggestLoading(false);
      if (!trimmedQuery) setPanelOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => runSuggest(trimmedQuery), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [trimmedQuery, canSuggest, runSuggest]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!anchorRef.current?.contains(event.target)) {
        closePanel();
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") closePanel();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closePanel]);

  const submitQuery = async (value) => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    requestIdRef.current += 1;
    closePanel();
    setSuggestions([]);
    setIsSubmitting(true);

    try {
      await onSearch(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitQuery(query);
  };

  const handleQuickPrompt = (prompt) => {
    if (disabled || !prompt?.trim()) return;
    setQuery(prompt);
    submitQuery(prompt);
  };

  const handlePickSuggestion = (movie) => {
    onSelectMovie?.(movie);
    setQuery(movie.title || movie.name || "");
    requestIdRef.current += 1;
    closePanel();
    setSuggestions([]);
  };

  const handleInputFocus = () => {
    if (canSuggest && suggestions.length > 0) setPanelOpen(true);
  };

  return (
    <div className="search-hero-block">
      <div className="search-hero-anchor" ref={anchorRef}>
        <div className="search-hero-shell">
          <form className="search-hero" onSubmit={handleSubmit}>
            <Search size={20} className="search-hero__icon" aria-hidden strokeWidth={1.75} />
            <input
              ref={inputRef}
              type="search"
              className="search-hero__input"
              placeholder="Search for movies, themes, moods, actors, directors..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleInputFocus}
              disabled={disabled}
              aria-label="Search movies"
              aria-expanded={showPanel}
              aria-controls="search-hero-suggestions"
              aria-autocomplete="list"
              autoComplete="off"
            />
            <button
              type="submit"
              className="search-hero__submit"
              disabled={disabled || isSubmitting}
              aria-label="Search"
            >
              {isSubmitting ? (
                <Loader2
                  size={20}
                  strokeWidth={1.75}
                  className="spin search-hero__submit-icon search-hero__submit-icon--loading"
                />
              ) : (
                <HeroOrnamentStar size={20} className="search-hero__submit-icon" />
              )}
            </button>
          </form>
        </div>

        <div
          id="search-hero-suggestions"
          className={clsx(
            "search-hero__suggestions-wrap",
            showPanel && "search-hero__suggestions-wrap--open"
          )}
          aria-hidden={!showPanel}
        >
          <ul
            className={clsx(
              "search-hero__suggestions",
              suggestLoading &&
                suggestions.length > 0 &&
                "search-hero__suggestions--refreshing"
            )}
            role="listbox"
          >
            {suggestLoading && suggestions.length === 0 ? (
              Array.from({ length: 4 }, (_, i) => (
                <li key={`sk-${i}`} className="search-hero__suggestion-skeleton" aria-hidden>
                  <span className="search-hero__skeleton-thumb skeleton-shimmer" />
                  <span className="search-hero__skeleton-line skeleton-shimmer" />
                </li>
              ))
            ) : (
              suggestions.map((movie) => (
                <SuggestionRow key={movie.id} movie={movie} onPick={handlePickSuggestion} />
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="quick-prompts" role="group" aria-label="Example searches">
        <span className="quick-prompts__label">Try:</span>
        <ul className="quick-prompts__list">
          {QUICK_PROMPTS.map((prompt, index) => (
            <li key={prompt}>
              {index > 0 && <span className="quick-prompts__dot" aria-hidden />}
              <button
                type="button"
                className="quick-prompts__link"
                disabled={disabled || isSubmitting}
                onClick={() => handleQuickPrompt(prompt)}
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function focusSearchInput() {
  document.querySelector(".search-hero__input")?.focus();
}
