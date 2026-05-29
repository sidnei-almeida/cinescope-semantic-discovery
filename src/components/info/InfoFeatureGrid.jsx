export default function InfoFeatureGrid({ items, columns = 2 }) {
  if (!items?.length) return null;

  return (
    <div
      className="info-feature-grid"
      style={{ "--info-feature-cols": columns }}
      role="list"
    >
      {items.map(({ title, text }) => (
        <article key={title} className="info-feature-card" role="listitem">
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}
