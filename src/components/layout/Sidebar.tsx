import { NavLink } from "react-router";
import { navigationItems, prefetchRoute } from "@/components/layout/navigation";

export function Sidebar() {
  return (
    <aside className="sidebar" id="sidebar-nav">
      <div className="sidebar-brand">
        <div className="brand-icon" aria-hidden="true">
          <span>M</span>
        </div>
        <span className="brand-name">Maestro</span>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const warm = () => prefetchRoute(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onPointerEnter={warm}
              onFocus={warm}
            >
              <Icon aria-hidden="true" className="nav-icon" size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

