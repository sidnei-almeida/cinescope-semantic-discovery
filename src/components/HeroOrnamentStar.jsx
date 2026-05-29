/**
 * Estrela ornamental minimalista (art déco) — SVG inline, sem ícone de biblioteca.
 */
export default function HeroOrnamentStar({ size = 18, className = "", title }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {/* eixos principais */}
      <path d="M12 3.5v17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.5 12h17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* diagonais curtas — detalhe ornamental */}
      <path
        d="M7.2 7.2l2.4 2.4M16.8 7.2l-2.4 2.4M7.2 16.8l2.4-2.4M16.8 16.8l-2.4-2.4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.72"
      />
      {/* pontas em losango suave */}
      <path
        d="M12 5.8l.85 2.35 2.35.85-2.35.85L12 12.7l-.85-2.35-2.35-.85 2.35-.85L12 5.8z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}
