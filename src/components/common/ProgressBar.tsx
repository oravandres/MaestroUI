interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label = "Progress" }: ProgressBarProps) {
  const bounded = Math.max(0, Math.min(100, value));

  return (
    <div
      className="progress-shell"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={bounded}
    >
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${bounded}%` }} />
      </div>
      <span>{bounded}%</span>
    </div>
  );
}
