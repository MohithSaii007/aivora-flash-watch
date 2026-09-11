import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BellRing } from "lucide-react";

import { EmptyState, KpiCard, Panel, PrototypeNotice } from "@/components/aivora/primitives";
import { AlertCard, HumanDecisionNotice } from "@/components/aivora/insight";
import { useSimulation } from "@/lib/aivora/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alert Center — AIVORA" },
      {
        name: "description",
        content:
          "Location-specific flash flood alerts with severity, probability, lead time, recommended action and acknowledgement workflow.",
      },
      { property: "og:title", content: "Alert Center — AIVORA" },
      {
        property: "og:description",
        content: "Escalation-ready alert management for district emergency control rooms.",
      },
    ],
  }),
  component: AlertsPage,
});

const TABS = ["ACTIVE", "ACKNOWLEDGED", "ESCALATED", "ALL"] as const;

function AlertsPage() {
  const sim = useSimulation();
  const [tab, setTab] = useState<(typeof TABS)[number]>("ACTIVE");

  const list = sim.alerts.filter((a) => tab === "ALL" || a.status === tab);
  const name = (id: string | null) =>
    (id && sim.locations.find((l) => l.id === id)?.name) || "District-wide";

  const counts = {
    active: sim.alerts.filter((a) => a.status === "ACTIVE").length,
    critical: sim.alerts.filter((a) => a.risk_level === "CRITICAL").length,
    warning: sim.alerts.filter((a) => a.risk_level === "WARNING").length,
    ack: sim.alerts.filter((a) => a.status === "ACKNOWLEDGED").length,
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Alert Center</h1>
          <p className="text-xs text-muted-foreground">
            Alerts are generated automatically when risk crosses configured thresholds
          </p>
        </div>
        <PrototypeNotice />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active alerts" value={counts.active} level={counts.active ? "WARNING" : "NORMAL"} live />
        <KpiCard label="Critical" value={counts.critical} level="CRITICAL" />
        <KpiCard label="Warning" value={counts.warning} level="WARNING" />
        <KpiCard label="Acknowledged" value={counts.ack} />
      </div>

      <HumanDecisionNotice />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cn(
              "rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider",
              tab === t ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No alerts in this view"
          body="AIVORA is monitoring continuously. Alerts appear automatically when risk crosses the watch, warning or critical thresholds."
          icon={<BellRing className="size-5 text-muted-foreground" />}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {list.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              locationName={name(a.location_id)}
              {...(a.location_id
                ? { onView: () => sim.setSelectedLocationId(a.location_id as string) }
                : {})}
            />
          ))}
        </div>
      )}

      <Panel title="Alert delivery channels" subtitle="Prototype status of downstream notification paths">
        <ul className="grid gap-2 text-xs sm:grid-cols-2">
          {[
            ["Control-room dashboard", "Active in prototype"],
            ["In-app notifications", "Active in prototype"],
            ["SMS gateway", "Not connected"],
            ["WhatsApp / IVR voice call", "Not connected"],
            ["Siren / public address", "Not connected"],
            ["State disaster management API", "Not connected"],
          ].map(([k, v]) => (
            <li
              key={k}
              className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2"
            >
              <span>{k}</span>
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-wider",
                  v === "Not connected" ? "text-muted-foreground" : "text-normal",
                )}
              >
                {v}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
