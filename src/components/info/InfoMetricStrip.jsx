export default function InfoMetricStrip({
  metrics,
  className = "",
  minimal = false,
}) {
  if (!metrics?.length) return null;

  return (
    <ul
      className={`info-metric-strip ${minimal ? "info-metric-strip--minimal" : ""} ${className}`.trim()}
      aria-label="Technical highlights"
    >
      {metrics.map(({ label, hint }) => (
        <li key={label} className="info-metric" title={hint || undefined}>
          <span className="info-metric__label">{label}</span>
          {!minimal && hint ? <span className="info-metric__hint">{hint}</span> : null}
        </li>
      ))}
    </ul>
  );
}
