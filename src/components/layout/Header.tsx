import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/api/health";
import { MobileNav } from "@/components/layout/MobileNav";
import { StatusBadge } from "@/components/common/StatusBadge";

export function Header() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const status = healthQuery.isSuccess
    ? healthQuery.data.status
    : healthQuery.isError
      ? "offline"
      : "loading";

  return (
    <header className="app-header">
      <MobileNav />
      <div>
        <p className="app-header-eyebrow">Maestro AI platform</p>
        <h1>Control center</h1>
      </div>
      <div className="header-status">
        <span>API</span>
        <StatusBadge status={status} />
      </div>
    </header>
  );
}

