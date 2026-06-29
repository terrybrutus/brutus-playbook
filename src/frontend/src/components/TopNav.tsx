import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { Activity, BookOpen, LayoutDashboard, Settings } from "lucide-react";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  /** Match prefix for active-route highlighting. */
  match: string;
  ocid: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    to: "/",
    icon: LayoutDashboard,
    match: "/",
    ocid: "nav.dashboard",
  },
  {
    label: "Signals",
    to: "/signals",
    icon: Activity,
    match: "/signals",
    ocid: "nav.signals",
  },
  {
    label: "Strategy",
    to: "/strategy",
    icon: BookOpen,
    match: "/strategy",
    ocid: "nav.strategy",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    match: "/settings",
    ocid: "nav.settings",
  },
];

/**
 * Persistent top navigation with active-route highlighting.
 * Uses TanStack Router's useLocation to determine the active route.
 */
export function TopNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <header className="border-b border-border bg-card shadow-subtle">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
        <Link
          to="/"
          data-ocid="nav.brand"
          className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-foreground"
        >
          <span
            className="inline-flex size-7 items-center justify-center rounded-md bg-primary/15 font-mono text-primary"
            aria-hidden="true"
          >
            B
          </span>
          <span className="hidden sm:inline">BRUTUS TERMINAL</span>
        </Link>

        <nav
          aria-label="Primary"
          className="flex flex-1 items-center gap-1 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.match === "/"
                ? pathname === "/"
                : pathname.startsWith(item.match);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-ocid={item.ocid}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-smooth",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:flex"
          aria-hidden="true"
        >
          <span className="size-1.5 animate-signal-pulse rounded-full bg-primary" />
          paper-analysis
        </div>
      </div>
    </header>
  );
}
