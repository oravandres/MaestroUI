interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading" }: LoadingStateProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <div className="loading-mark" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

