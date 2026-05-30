import { SEMANTIC_MODEL_SERVICE_URL } from "../config/constants.js";

export default function ApiConsole({ stackTags = [] }) {
  const endpoint = `${SEMANTIC_MODEL_SERVICE_URL}/api/v1/recommend`;

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
          <code className="api-path">{endpoint}</code>
        </div>
      </div>
      <p className="api-console-note">
        Hosted on Render (BERT + Annoy). The Vercel app proxies <code>/recommender</code>{" "}
        to this API so the browser avoids CORS — inference still runs on Render.
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
