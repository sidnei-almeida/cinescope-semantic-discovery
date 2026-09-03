import { API_ENDPOINT, INDEXED_MOVIES_LABEL } from "../config/projectFacts.js";

export default function ApiConsole({ stackTags = [] }) {
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
      <p className="api-console-note">
        Same-origin Python serverless function. The encoder and the{" "}
        {INDEXED_MOVIES_LABEL}-vector index ship with the deployment, so there is no
        external service to wake up — a warm request answers in about 40 ms.
      </p>
      <pre className="api-console-body">{`{
  "synopsis": "A thief who steals secrets through dreams…",
  "genre": "Action, Science Fiction",
  "year": 2010,
  "title": "Inception",
  "top_k": 20
}`}</pre>
      {stackTags.length > 0 && (
        <div className="api-console-tags" role="list" aria-label="Related technologies">
          {stackTags.map((tag) => (
            <span key={tag} className="dev-tag" role="listitem">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export { API_ENDPOINT };
