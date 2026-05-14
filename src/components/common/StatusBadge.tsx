import type { ReactNode } from "react";

const statusTone: Record<string, string> = {
  healthy: "success",
  hot: "success",
  ok: "success",
  online: "success",
  degraded: "warning",
  loading: "warning",
  queued: "warning",
  running: "warning",
  offline: "error",
  failed: "error",
  evicting: "error",
  unknown: "muted",
  cold: "muted",
  critical: "error",
  high: "error",
  major: "error",
  medium: "warning",
  moderate: "warning",
  low: "muted",
  nit: "muted",
  info: "muted",
};

interface StatusBadgeProps {
  status: string | undefined | null;
  children?: ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() || "unknown";
  const tone = statusTone[normalized] ?? "muted";

  return (
    <span className={`status-badge status-badge-${tone}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {children ?? normalized}
    </span>
  );
}

