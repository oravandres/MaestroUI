import { StatusBadge } from "@/components/common/StatusBadge";

interface ConfidenceBadgeProps {
  confidence: string | null | undefined;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const normalized = confidence?.trim().toLowerCase();

  if (!normalized) {
    return <StatusBadge status="unknown">pending</StatusBadge>;
  }

  const status = confidenceStatus(normalized);
  return <StatusBadge status={status}>{normalized}</StatusBadge>;
}

function confidenceStatus(confidence: string): string {
  if (confidence === "high") return "ok";
  if (confidence === "medium") return "degraded";
  if (confidence === "low") return "failed";
  return "unknown";
}
