import { DATA_FEATURES, TECH_METRICS } from "../config/projectFacts.js";
import InfoFeatureGrid from "./info/InfoFeatureGrid.jsx";
import InfoMetricStrip from "./info/InfoMetricStrip.jsx";

export default function DataSection() {
  return (
    <section id="data" className="info-section" aria-labelledby="data-title">
      <span className="info-section-eyebrow">Data enrichment</span>
      <h2 id="data-title" className="info-section-title">
        TMDb Enrichment Layer
      </h2>
      <p className="info-section-lead">
        The semantic API returns lean recommendation candidates:{" "}
        <code>movie_id</code>, <code>similarity_score</code>, titles, and available overview
        data. CineScope then uses TMDb as an enrichment layer to transform those candidates
        into a cinematic discovery interface.
      </p>
      <p className="info-section-secondary">
        This second layer adds posters, backdrops, cast profiles, trailers, metadata,
        release information, ratings, popularity signals, and visual context — without
        replacing the semantic model as the primary retrieval engine.
      </p>

      <InfoFeatureGrid items={DATA_FEATURES} columns={2} />
      <InfoMetricStrip
        metrics={[TECH_METRICS[5], TECH_METRICS[3]]}
        className="info-metric-strip--compact"
      />
      <p className="info-section-note">
        Movie metadata and imagery are provided through TMDb.
      </p>
    </section>
  );
}
