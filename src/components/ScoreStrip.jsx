import ScoreMetric from "./spotlight/ScoreMetric.jsx";
import { buildSpotlightMetrics } from "../utils/spotlightMetrics.js";

export default function ScoreStrip({ movie, semanticScore }) {
  const metrics = buildSpotlightMetrics(movie, semanticScore);

  if (!metrics.length) return null;

  return (
    <div
      className="spotlight-score-strip"
      style={{
        gridTemplateColumns: `repeat(${metrics.length}, minmax(72px, 1fr))`,
      }}
    >
      {metrics.map((metric) => (
        <ScoreMetric
          key={metric.key}
          icon={metric.icon}
          value={metric.value}
          suffix={metric.suffix}
          label={metric.label}
          sublabel={metric.sublabel}
        />
      ))}
    </div>
  );
}
