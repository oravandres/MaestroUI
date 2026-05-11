import { Menu } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";
import { navigationItems } from "@/components/layout/navigation";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-nav">
      <button
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="icon-button"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <Menu aria-hidden="true" size={20} />
        <span className="sr-only">Toggle navigation</span>
      </button>
      {open ? (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) => `mobile-link ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

