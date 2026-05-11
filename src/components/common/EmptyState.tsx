import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  children?: ReactNode;
}

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="state-panel">
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

