import ScoreMetricIcon from "./ScoreMetricIcon.jsx";

export default function ScoreMetric({ value, suffix, label, sublabel, icon = "star" }) {
  if (value === null || value === undefined || value === "—") {
    return null;
  }

  return (
    <div className="score-metric">
      <div className="score-metric__value">
        <strong>{value}</strong>
        {suffix && <span>{suffix}</span>}
      </div>
      {sublabel && <span className="score-metric__sublabel">{sublabel}</span>}
      <div className="score-metric__label">
        <ScoreMetricIcon name={icon} className="score-metric__icon" size={11} />
        <small>{label}</small>
      </div>
    </div>
  );
}
