export default function ApiConsole() {
  return (
    <div className="api-console">
      <div className="api-console-header">
        <div className="api-console-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="api-console-route">
          <span className="api-method">POST</span>
          <code className="api-path">/api/v1/recommend</code>
        </div>
      </div>
      <pre className="api-console-body">{`{
  "synopsis": "A thief who steals secrets through dreams…",
  "genre": "Action, Science Fiction",
  "year": 2010,
  "title": "Inception",
  "top_k": 20
}`}</pre>
    </div>
  );
}
