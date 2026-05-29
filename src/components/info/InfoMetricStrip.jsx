export default function InfoMetricStrip({ metrics, className = "" }) {
  if (!metrics?.length) return null;

  return (
    <ul className={`info-metric-strip ${className}`.trim()} aria-label="Technical highlights">
      {metrics.map(({ label, hint }) => (
        <li key={label} className="info-metric" title={hint}>
          <span className="info-metric__label">{label}</span>
          {hint && <span className="info-metric__hint">{hint}</span>}
        </li>
      ))}
    </ul>
  );
}
