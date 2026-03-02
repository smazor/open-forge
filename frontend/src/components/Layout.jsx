import { NavLink, Outlet } from "react-router-dom";
import {
  Hammer,
  Home,
  Wrench,
  Bot,
  MessageSquare,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Dashboard", end: true },
  { to: "/skills", icon: Wrench, label: "Skills" },
  { to: "/agents", icon: Bot, label: "Agents" },
];

function SidebarLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-accent/10 text-accent"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay",
        ].join(" ")
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 bg-surface-raised border-r border-border flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Hammer className="w-4 h-4 text-accent" />
          </div>
          <span className="font-semibold tracking-tight">SkillForge</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        {/* Status bar */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Activity className="w-3 h-3 text-success" />
            <span>System Online</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-grid">
        <Outlet />
      </main>
    </div>
  );
}
