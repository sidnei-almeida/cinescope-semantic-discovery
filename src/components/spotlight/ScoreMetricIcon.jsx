const ICONS = {
  star: (
    <>
      <path
        d="M8 2.2l1.35 2.74 3.02.44-2.18 2.13.52 3.01L8 9.38 4.29 10.5l.52-3.01-2.18-2.13 3.02-.44L8 2.2z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </>
  ),
  semantic: (
    <>
      <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M8 1.6v2.2M8 12.2v2.2M1.6 8h2.2M12.2 8h2.2M3.4 3.4l1.55 1.55M11.05 11.05l1.55 1.55M12.6 3.4l-1.55 1.55M4.95 11.05l-1.55 1.55"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.85"
      />
    </>
  ),
  popularity: (
    <>
      <path
        d="M2.5 11.2 5.2 7.4l2.1 2.4 2.4-3.6 2.2 2.1 1.6-2.3"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.5 12.5h11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  release: (
    <>
      <rect
        x="2.8"
        y="3.2"
        width="10.4"
        height="9.6"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path d="M2.8 6.2h10.4" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <path d="M5.4 1.8v2.2M10.6 1.8v2.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
  tomatometer: (
    <>
      <circle cx="8" cy="8.2" r="4.6" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M8 5.2c-1.4 1.6-1.4 3.2 0 4.8 1.4-1.6 1.4-3.2 0-4.8z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </>
  ),
  awards: (
    <>
      <path
        d="M8 2.4v4.2M6.1 8.8h3.8M5.2 11.2 4 13.6M10.8 11.2 12 13.6"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.6 6.6h4.8l-.7 2.2H6.3l-.7-2.2z"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
    </>
  ),
};

export default function ScoreMetricIcon({ name, size = 12, className = "" }) {
  const paths = ICONS[name] ?? ICONS.star;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {paths}
    </svg>
  );
}
