import { LOADING_MESSAGES } from "../config/loadingMessages.js";

export default function LoadingScreen({
  message = LOADING_MESSAGES.boot,
  showRetry = false,
  onRetry,
}) {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-grain" aria-hidden="true" />
      <div className="loading-projector" aria-hidden="true" />

      <div className="loading-content">
        <div className="loading-brand">
          <img
            className="loading-logo-img"
            src="/brand-projector.svg"
            alt=""
            width={22}
            height={22}
          />
          <h1>CineScope Intelligence</h1>
        </div>

        <div className="loading-ornament" aria-hidden="true">
          <span />
          <i>✦</i>
          <span />
        </div>

        <p className="loading-message">{message}</p>

        <div className="loading-progress" aria-hidden="true">
          <span />
        </div>

        {showRetry && (
          <button type="button" className="loading-retry-btn" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
