import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import clsx from "clsx";
import { applyPageFind, clearPageFind, stepPageFind } from "../utils/pageFind.js";

export default function HeaderPageFind() {
  const inputId = useId();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matchInfo, setMatchInfo] = useState({ total: 0, activeIndex: -1 });
  const location = useLocation();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setMatchInfo({ total: 0, activeIndex: -1 });
    clearPageFind();
  }, []);

  useEffect(() => {
    close();
  }, [location.pathname, close]);

  useEffect(() => {
    if (!open) return undefined;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const id = window.setTimeout(() => {
      if (!query.trim()) {
        clearPageFind();
        setMatchInfo({ total: 0, activeIndex: -1 });
        return;
      }
      setMatchInfo(applyPageFind(query));
    }, 120);

    return () => window.clearTimeout(id);
  }, [query, open]);

  useEffect(() => () => clearPageFind(), []);

  const toggleOpen = () => {
    if (open) {
      close();
      return;
    }
    setOpen(true);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "Enter" && query.trim()) {
      event.preventDefault();
      setMatchInfo((prev) =>
        stepPageFind(query, event.shiftKey ? -1 : 1, prev.activeIndex)
      );
    }
  };

  const resultLabel =
    matchInfo.total > 0
      ? `${matchInfo.activeIndex + 1} de ${matchInfo.total}`
      : query.trim()
        ? "Nenhum resultado na página"
        : "";

  return (
    <div className={clsx("header-page-find", open && "header-page-find--open")}>
      <span className="header-page-find-live" aria-live="polite">
        {open ? resultLabel : ""}
      </span>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        className="header-page-find-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Procurar na página…"
        aria-label="Procurar na página"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      <button
        type="button"
        className={clsx("icon-btn", open && "icon-btn--active")}
        aria-label={open ? "Fechar busca na página" : "Procurar na página"}
        aria-expanded={open}
        aria-controls={inputId}
        onClick={toggleOpen}
      >
        <Search size={18} className="icon-gold" />
      </button>
    </div>
  );
}
