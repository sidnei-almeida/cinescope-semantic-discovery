import { useState } from "react";
import { Search, Bookmark, Menu, X } from "lucide-react";
import clsx from "clsx";

const NAV_LINKS = [
  { label: "Discover", href: "#discover", active: true },
  { label: "Movies", href: "#movies" },
  { label: "People", href: "#people" },
  { label: "Collections", href: "#collections" },
  { label: "Lists", href: "#lists" },
  { label: "About", href: "#about" },
];

export default function Header({ onSearchFocus }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a href="#discover" className="brand">
          <img src="/brand-projector.svg" alt="" className="brand-mark" width={32} height={32} />
          <span className="brand-name">CineScope Intelligence</span>
        </a>

        <nav className={clsx("main-nav", mobileOpen && "main-nav--open")} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={clsx(link.active && "active")}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="Search"
            onClick={onSearchFocus}
          >
            <Search size={18} className="icon-gold" />
          </button>
          <button type="button" className="icon-btn" aria-label="Watchlist">
            <Bookmark size={18} className="icon-gold" />
          </button>
          <a
            href="https://sidnei-almeida.github.io"
            className="header-portfolio-btn"
            target="_blank"
            rel="noreferrer"
          >
            Portfolio
          </a>
          <button
            type="button"
            className="icon-btn mobile-menu-btn"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
