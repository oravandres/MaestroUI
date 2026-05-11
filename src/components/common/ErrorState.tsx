import { ApiError, NetworkError } from "@/api/client";

function userMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "This API is not available yet.";
    if (error.code === "unauthorized") return "Authentication is required.";
    if (error.code === "provider_unavailable") return "The provider is unavailable.";
    return error.message || "The request failed.";
  }
  if (error instanceof NetworkError) return "The Maestro API could not be reached.";
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

interface ErrorStateProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

export function ErrorState({
  error,
  title = "Unable to load",
  onRetry,
}: ErrorStateProps) {
  const requestId = error instanceof ApiError ? error.requestId : undefined;

  return (
    <div className="state-panel state-panel-error" role="alert">
      <h2>{title}</h2>
      <p>{userMessage(error)}</p>
      {requestId ? <p className="state-meta">Request ID: {requestId}</p> : null}
      {onRetry ? (
        <button className="button button-secondary" type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

