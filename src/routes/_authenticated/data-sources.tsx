import { createFileRoute } from "@tanstack/react-router";

import { Panel, PrototypeNotice } from "@/components/aivora/primitives";
import { futureIntegrations } from "@/services/aivoraApi";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/data-sources")({
  head: () => ({
    meta: [
      { title: "Data Sources — AIVORA" },
      {
        name: "description",
        content:
          "Which data feeds AIVORA uses, which are simulated in this prototype, and which real integrations the architecture is ready for.",
      },
      { property: "og:title", content: "Data Sources — AIVORA" },
      {
        property: "og:description",
        content: "Transparent data-source inventory: simulated now, integration-ready next.",
      },
    ],
  }),
  component: DataSourcesPage,
});

const SIMULATED = [
  ["IoT rainfall gauges", "Tipping-bucket style rainfall intensity per village", "Simulated"],
  ["River level sensors", "Ultrasonic stage measurement with rate of rise", "Simulated"],
  ["Soil moisture probes", "Volumetric saturation in upper catchments", "Simulated"],
  ["Local weather stations", "Temperature, humidity, pressure context", "Simulated"],
  ["Terrain & slope data", "Elevation, slope, drainage density, stream distance", "Simulated"],
  ["Historical event archive", "Past flood and landslide records for frequency weighting", "Prototype dataset"],
  ["Vulnerability register", "Population, houses, schools, hospitals, bridges", "Prototype dataset"],
  ["Shelter & road network", "Capacity, accessibility and route safety", "Prototype dataset"],
];

function DataSourcesPage() {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Data Sources</h1>
          <p className="text-xs text-muted-foreground">
            Honest accounting of what is simulated today and what the architecture can accept tomorrow
          </p>
        </div>
        <PrototypeNotice />
      </header>

      <Panel title="Sources used by this prototype" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {["Source", "What it provides", "Status"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left data-label">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SIMULATED.map(([n, d, s]) => (
                <tr key={n}>
                  <td className="px-4 py-2.5 font-medium">{n}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{d}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-watch">{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Integration-ready connections"
        subtitle="Each has a service-layer entry point but is intentionally not connected in the prototype"
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {FUTURE_INTEGRATIONS.map((f) => (
            <li key={f.name} className="rounded-md border border-border bg-surface-2 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">{f.name}</span>
                <span
                  className={cn(
                    "font-mono text-[10px] uppercase tracking-wider",
                    f.connected ? "text-normal" : "text-muted-foreground",
                  )}
                >
                  {f.connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{f.purpose}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
