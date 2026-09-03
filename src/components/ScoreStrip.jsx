import ScoreMetric from "./spotlight/ScoreMetric.jsx";
import { buildSpotlightMetrics } from "../utils/spotlightMetrics.js";

export default function ScoreStrip({ movie, semanticScore }) {
  const metrics = buildSpotlightMetrics(movie, semanticScore);

  if (!metrics.length) return null;

  // Column count is left to CSS so the strip can reflow to two rows on narrow
  // screens instead of squeezing every metric onto one line.
  return (
    <div className="spotlight-score-strip">
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
