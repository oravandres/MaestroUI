import { Outlet, NavLink } from "react-router";

export function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar" id="sidebar-nav">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="22" height="22" rx="4" stroke="url(#maestro-grad)" strokeWidth="2.5" fill="none" />
              <path d="M9 14H19M14 9V19" stroke="url(#maestro-grad)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="9" r="1.5" fill="url(#maestro-grad)" />
              <circle cx="19" cy="9" r="1.5" fill="url(#maestro-grad)" />
              <circle cx="9" cy="19" r="1.5" fill="url(#maestro-grad)" />
              <circle cx="19" cy="19" r="1.5" fill="url(#maestro-grad)" />
              <defs>
                <linearGradient id="maestro-grad" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="brand-name">Maestro</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} id="nav-dashboard">
            <span className="nav-icon">◉</span>
            <span>Dashboard</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator" id="api-status">
            <span className="status-dot" />
            <span className="status-text">Maestro API</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
