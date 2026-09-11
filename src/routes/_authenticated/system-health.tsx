import { createFileRoute } from "@tanstack/react-router";

import { Freshness, KpiCard, LiveIndicator, Panel, PrototypeNotice, StatBar } from "@/components/aivora/primitives";
import { useSimulation } from "@/lib/aivora/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/system-health")({
  head: () => ({
    meta: [
      { title: "System Health — AIVORA" },
      {
        name: "description",
        content:
          "Prediction engine status, data freshness, sensor uptime, network connectivity and offline resilience for the AIVORA prototype.",
      },
      { property: "og:title", content: "System Health — AIVORA" },
      {
        property: "og:description",
        content: "Operational transparency: engine, data, sensors and connectivity at a glance.",
      },
    ],
  }),
  component: SystemHealthPage,
});

function SystemHealthPage() {
  const sim = useSimulation();
  const total = sim.sensors.length || 1;
  const online = sim.sensors.filter((s) => s.status === "ONLINE").length;
  const uptime = Math.round((online / total) * 100);
  const avgBattery = sim.sensors.reduce((n, s) => n + s.battery, 0) / total;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">System Health</h1>
          <p className="text-xs text-muted-foreground">
            AIVORA degrades gracefully: last known values are retained when data stops arriving
          </p>
        </div>
        <PrototypeNotice />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Prediction engine" value={sim.running ? "ACTIVE" : "PAUSED"} live={sim.running} />
        <KpiCard label="Sensor uptime" value={`${uptime}%`} hint={`${online}/${total} nodes online`} level={uptime < 70 ? "WARNING" : "NORMAL"} live />
        <KpiCard label="Average battery" value={`${avgBattery.toFixed(0)}%`} level={avgBattery < 30 ? "WATCH" : "NORMAL"} />
        <KpiCard label="Connectivity" value={sim.connectivity} level={sim.connectivity === "OFFLINE" ? "CRITICAL" : sim.connectivity === "LIMITED" ? "WATCH" : "NORMAL"} live />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Service status" action={<LiveIndicator label={sim.running ? "MONITORING" : "IDLE"} tone={sim.running ? "normal" : "watch"} />}>
          <ul className="space-y-2 text-xs">
            {[
              ["Simulation & prediction engine", sim.running ? "Operational" : "Paused"],
              ["Database (Lovable Cloud)", sim.loadError ? "Degraded" : "Operational"],
              ["Realtime updates", sim.connectivity === "OFFLINE" ? "Suspended" : "Operational"],
              ["Alert generation", "Operational"],
              ["GIS map tiles", "Operational"],
              ["External integrations", "Not connected"],
            ].map(([k, v]) => (
              <li key={k} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
                <span>{k}</span>
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-wider",
                    v === "Operational" ? "text-normal" : v === "Not connected" ? "text-muted-foreground" : "text-watch",
                  )}
                >
                  {v}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Data freshness & resilience">
          <div className="space-y-3">
            <StatBar label="Sensor network health" value={uptime} tone={uptime > 80 ? "normal" : uptime > 60 ? "watch" : "critical"} />
            <StatBar label="Average node battery" value={avgBattery} tone={avgBattery > 50 ? "normal" : "watch"} />
            <StatBar label="Refresh cadence" value={Math.round(sim.refreshMs / 1000)} max={30} unit="s" tone="primary" />
          </div>
          <div className="mt-4 space-y-1.5">
            <Freshness ts={sim.lastUpdate} prefix="Last prediction cycle" />
            <p className="text-[11px] text-muted-foreground">
              {sim.connectivity === "OFFLINE"
                ? "Offline mode: showing last known values with clear staleness labels. No new predictions are being generated."
                : sim.connectivity === "LIMITED"
                  ? "Limited connectivity: some nodes are not reporting. Predictions use the most recent valid readings."
                  : "All monitored locations are receiving simulated readings on schedule."}
            </p>
          </div>
        </Panel>
      </div>

      <Panel title="Node-level status" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {["Node", "Type", "Status", "Value", "Battery", "Connectivity", "Quality"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left data-label">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sim.sensors.map((s) => (
                <tr key={s.sensor.id}>
                  <td className="metric px-4 py-2">{s.sensor.sensor_id}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.sensor.sensor_type}</td>
                  <td
                    className={cn(
                      "px-4 py-2 font-mono text-[10px] uppercase",
                      s.status === "ONLINE" ? "text-normal" : s.status === "WARNING" || s.status === "LOW BATTERY" ? "text-watch" : "text-critical",
                    )}
                  >
                    {s.status}
                  </td>
                  <td className="metric px-4 py-2">
                    {s.value.toFixed(1)} {s.unit}
                  </td>
                  <td className="metric px-4 py-2">{s.battery.toFixed(0)}%</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.connectivity}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.quality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
