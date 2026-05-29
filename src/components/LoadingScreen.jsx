import { LOADING_MESSAGES } from "../config/loadingMessages.js";

export default function LoadingScreen({
  message = LOADING_MESSAGES.boot,
}) {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-grain" aria-hidden="true" />
      <div className="loading-projector" aria-hidden="true" />

      <div className="loading-content">
        <div className="loading-logo">
          <img
            className="loading-logo-img"
            src="/brand-projector.svg"
            alt=""
            width={28}
            height={28}
          />
          <span>CineScope</span>
        </div>

        <h1>CineScope Intelligence</h1>

        <div className="loading-ornament" aria-hidden="true">
          <span />
          <i>✦</i>
          <span />
        </div>

        <p className="loading-message">{message}</p>

        <div className="loading-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
