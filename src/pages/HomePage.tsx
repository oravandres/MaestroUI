import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/api/health";

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  return (
    <div className="page-container" id="home-page">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">AI workflow orchestration command center</p>
      </header>

      <div className="stats-grid" id="stats-overview">
        <div className="stat-card glass" id="stat-api-status">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <span className="stat-label">API Status</span>
            <span className={`stat-value ${healthQuery.isSuccess ? "text-success" : healthQuery.isError ? "text-error" : "text-muted"}`}>
              {healthQuery.isLoading && "Checking…"}
              {healthQuery.isSuccess && healthQuery.data.status}
              {healthQuery.isError && "Unreachable"}
            </span>
          </div>
        </div>

        <div className="stat-card glass" id="stat-workflows">
          <div className="stat-icon">🔄</div>
          <div className="stat-content">
            <span className="stat-label">Workflows</span>
            <span className="stat-value text-muted">Coming soon</span>
          </div>
        </div>

        <div className="stat-card glass" id="stat-runs">
          <div className="stat-icon">▶️</div>
          <div className="stat-content">
            <span className="stat-label">Active Runs</span>
            <span className="stat-value text-muted">Coming soon</span>
          </div>
        </div>

        <div className="stat-card glass" id="stat-services">
          <div className="stat-icon">🔗</div>
          <div className="stat-content">
            <span className="stat-label">Services</span>
            <span className="stat-value text-muted">Coming soon</span>
          </div>
        </div>
      </div>

      <section className="welcome-section glass" id="welcome-banner">
        <div className="welcome-content">
          <h2>Welcome to Maestro</h2>
          <p>
            Maestro orchestrates your MiMi cluster services into automated,
            repeatable workflows. Compose pipelines that span Logos, DarkBase,
            and Echo.
          </p>
          <div className="welcome-features">
            <div className="feature-item">
              <span className="feature-icon">🎼</span>
              <div>
                <strong>Compose Workflows</strong>
                <p>Chain services into multi-step pipelines</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⏰</span>
              <div>
                <strong>Schedule &amp; Automate</strong>
                <p>Cron-based triggers for hands-free operation</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <div>
                <strong>Monitor Runs</strong>
                <p>Track execution status, timing, and errors</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
