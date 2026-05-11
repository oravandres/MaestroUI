import { StatusBadge } from "@/components/common/StatusBadge";

interface ModelStateBadgeProps {
  state: string | undefined | null;
}

export function ModelStateBadge({ state }: ModelStateBadgeProps) {
  return <StatusBadge status={state}>{state || "unknown"}</StatusBadge>;
}

