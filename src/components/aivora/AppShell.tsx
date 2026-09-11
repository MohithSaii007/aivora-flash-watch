import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  Brain,
  Database,
  Gauge,
  Heart,
  History,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Radio,
  Route as RouteIcon,
  Settings,
  ShieldAlert,
  Siren,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Freshness, LiveIndicator, PrototypeNotice, RiskBadge } from "./primitives";
import { Button } from "@/components/ui/button";
import { ROLE_ACCESS, ROLE_LABELS, useAuth } from "@/hooks/useAuth";
import { useDistrictSummary, useSimulation } from "@/lib/aivora/store";
import { riskLevelFromScore } from "@/lib/aivora/engine";
import { cn } from "@/lib/utils";

const NAV: Array<{ to: string; label: string; icon: typeof Gauge }> = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/risk-map", label: "Live Risk Map", icon: MapIcon },
  { to: "/predictions", label: "Predictions", icon: Brain },
  { to: "/sensors", label: "IoT Sensors", icon: Radio },
  { to: "/vulnerability", label: "Vulnerability", icon: Users },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/evacuation", label: "Evacuation", icon: RouteIcon },
  { to: "/emergency-actions", label: "Emergency Actions", icon: Siren },
  { to: "/historical", label: "Historical Events", icon: History },
  { to: "/simulation", label: "Simulation", icon: Sparkles },
  { to: "/data-sources", label: "Data Sources", icon: Database },
  { to: "/pipeline", label: "Data Pipeline", icon: Workflow },
  { to: "/system-health", label: "System Health", icon: ShieldAlert },
  { to: "/community", label: "Community View", icon: Heart },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { role, displayName, user, signOut } = useAuth();
  const sim = useSimulation();
  const summary = useDistrictSummary();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const allowed = role ? ROLE_ACCESS[role] : ROLE_ACCESS.admin;
  const items = NAV.filter((n) => allowed.includes(n.to));
  const unread = sim.notifications.filter((n) => !n.read).length;
  const districtLevel = riskLevelFromScore(
    summary.worst?.prediction.riskScore ?? 0,
    sim.thresholds,
  );
  const emergencyMode = districtLevel === "CRITICAL";

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary/15 font-display text-sm font-bold text-primary">
              AV
            </span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold tracking-wide">AIVORA</span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Flood Intelligence
              </span>
            </span>
          </Link>
          <button className="lg:hidden" onClick={() => setNavOpen(false)} aria-label="Close navigation">
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {items.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to as "/"}
                onClick={() => setNavOpen(false)}
                className={cn(
                  "mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <PrototypeNotice />
        </div>
      </aside>

      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <button className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open navigation">
              <Menu className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="data-label">District status</span>
              <RiskBadge level={districtLevel} />
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="data-label">Connectivity</span>
              <LiveIndicator
                label={
                  sim.connectivity === "CONNECTED"
                    ? "CONNECTED"
                    : sim.connectivity === "LIMITED"
                      ? "LIMITED CONNECTIVITY"
                      : "OFFLINE MODE"
                }
                tone={
                  sim.connectivity === "CONNECTED"
                    ? "normal"
                    : sim.connectivity === "LIMITED"
                      ? "watch"
                      : "critical"
                }
              />
            </div>

            <div className="hidden md:block">
              <Freshness ts={sim.lastUpdate} />
            </div>

            {emergencyMode && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-critical/50 bg-critical/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-critical">
                <span className="size-1.5 animate-pulse-live rounded-full bg-critical" aria-hidden="true" />
                Emergency mode
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  sim.startDemo();
                  void navigate({ to: "/overview" });
                }}
              >
                <Sparkles className="size-3.5" /> Live demo
              </Button>

              <button
                className="relative rounded-md border border-border bg-secondary p-2"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  sim.markNotificationsRead();
                }}
                aria-label={`Notifications (${unread} unread)`}
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-critical font-mono text-[9px] font-bold text-critical-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              <div className="hidden items-center gap-2 rounded-md border border-border bg-secondary px-2.5 py-1.5 sm:flex">
                <span className="grid size-6 place-items-center rounded-full bg-primary/20 font-mono text-[10px] text-primary">
                  {(displayName || user?.email || "U").slice(0, 2).toUpperCase()}
                </span>
                <span className="leading-tight">
                  <span className="block max-w-32 truncate text-xs font-medium">
                    {displayName || user?.email || "Operator"}
                  </span>
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {role ? ROLE_LABELS[role] : "—"}
                  </span>
                </span>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await signOut();
                  void navigate({ to: "/" });
                }}
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>

          {sim.demoRunning && (
            <div className="relative h-0.5 overflow-hidden bg-muted">
              <div className="absolute inset-y-0 w-1/3 animate-sweep bg-primary" />
            </div>
          )}
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {/* Notification drawer */}
      {notifOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-surface shadow-panel">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Notification centre</h2>
              <p className="text-xs text-muted-foreground">
                Warnings, sensor faults and response recommendations
              </p>
            </div>
            <button onClick={() => setNotifOpen(false)} aria-label="Close notifications">
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {sim.notifications.length === 0 && (
              <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                No notifications yet. Start the simulation to generate live events.
              </p>
            )}
            <ul className="space-y-2">
              {sim.notifications.map((n) => (
                <li key={n.id} className="panel p-3">
                  <div className="flex items-center justify-between gap-2">
                    <RiskBadge level={n.level} />
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(n.ts).toLocaleTimeString()}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xs font-semibold">{n.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
