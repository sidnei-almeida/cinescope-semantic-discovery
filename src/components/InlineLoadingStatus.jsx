import { getLoadingMessage } from "../utils/loadingStages.js";

export default function InlineLoadingStatus({ stage, message }) {
  const text = message ?? getLoadingMessage(stage);
  if (!text) return null;

  return (
    <div className="inline-loading-status" role="status" aria-live="polite">
      <span className="loading-dot" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
