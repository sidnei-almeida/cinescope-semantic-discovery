export default function InfoDetailList({ items, className = "" }) {
  if (!items?.length) return null;

  return (
    <div className={`info-detail-list ${className}`.trim()} role="list">
      {items.map(({ title, text }) => (
        <div key={title} className="info-detail-item" role="listitem">
          <p className="info-detail-label">{title}</p>
          <p className="info-detail-text">{text}</p>
        </div>
      ))}
    </div>
  );
}
