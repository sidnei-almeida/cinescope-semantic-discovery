const PIPELINE_STEPS = [
  "Query",
  "Semantic Search",
  "TMDb Enrichment",
  "Ranked Results",
];

export default function EngineSection() {
  return (
    <section className="engine-section" id="about">
      <div className="engine-strip">
        <div className="engine-strip-header">
          <span className="section-eyebrow">CineScope Engine</span>
          <p>From natural language intent to ranked movie discovery.</p>
        </div>

        <div className="engine-pipeline" aria-label="CineScope recommendation pipeline">
          {PIPELINE_STEPS.flatMap((label, index) => {
            const items = [
              <span key={label} className="engine-pipeline-item">
                {label}
              </span>,
            ];
            if (index < PIPELINE_STEPS.length - 1) {
              items.push(
                <span key={`arrow-${label}`} className="engine-pipeline-arrow" aria-hidden>
                  →
                </span>
              );
            }
            return items;
          })}
        </div>
      </div>
    </section>
  );
}
