import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import HeaderPageFind from "./HeaderPageFind.jsx";

const NAV_LINKS = [
  { label: "Discover", to: "/", end: true },
  { label: "Model", to: "/model" },
  { label: "Data", to: "/data" },
  { label: "Workflow", to: "/workflow" },
  { label: "About", to: "/about" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The bar is translucent over the hero and becomes an opaque surface once
  // content scrolls beneath it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={clsx("site-header", scrolled && "site-header--scrolled")}>
      <div className="site-header__inner">
        <NavLink to="/" end className="brand" onClick={() => setMobileOpen(false)}>
          <img src="/brand-aperture.svg" alt="" className="brand-mark" width={32} height={32} />
          <span className="brand-name">CineScope Intelligence</span>
        </NavLink>

        <nav className={clsx("main-nav", mobileOpen && "main-nav--open")} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                clsx("nav-link", isActive && "nav-link--active")
              }
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <HeaderPageFind />
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
