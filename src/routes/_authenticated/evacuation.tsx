import { createFileRoute } from "@tanstack/react-router";

import { KpiCard, Panel, PrototypeNotice, StatBar } from "@/components/aivora/primitives";
import { LocationSelector } from "@/components/aivora/insight";
import { EvacuationOrderPanel } from "@/components/aivora/EvacuationOrder";
import { RiskMap } from "@/components/aivora/RiskMap";
import { useSimulation } from "@/lib/aivora/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/evacuation")({
  head: () => ({
    meta: [
      { title: "Evacuation Intelligence — AIVORA" },
      {
        name: "description",
        content:
          "Safe evacuation routes, shelter capacity, blocked roads and landslide-prone segments for hilly flash flood response.",
      },
      { property: "og:title", content: "Evacuation Intelligence — AIVORA" },
      {
        property: "og:description",
        content: "Route safety scoring, shelter availability and road accessibility in one operational view.",
      },
    ],
  }),
  component: EvacuationPage,
});

function EvacuationPage() {
  const sim = useSimulation();
  const selected = sim.live[sim.selectedLocationId];

  const routes = sim.routes
    .filter((r) => !r.origin_location || r.origin_location === sim.selectedLocationId)
    .sort((a, b) => b.route_safety_score - a.route_safety_score);

  const shelterName = (id: string | null) =>
    (id && sim.shelters.find((s) => s.id === id)?.name) || "Nearest designated shelter";

  const capacity = sim.shelters.reduce((n, s) => n + s.capacity, 0);
  const available = sim.shelters.reduce((n, s) => n + s.available_capacity, 0);
  const blocked = sim.roads.filter((r) => r.status !== "OPEN").length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Evacuation Intelligence</h1>
          <p className="text-xs text-muted-foreground">
            Safest routes account for flood risk, landslide-prone slopes and current road status
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LocationSelector label="Origin" />
          <PrototypeNotice />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Shelters" value={sim.shelters.length} hint="Designated relief centres" />
        <KpiCard label="Total capacity" value={capacity.toLocaleString()} hint="People" />
        <KpiCard
          label="Available capacity"
          value={available.toLocaleString()}
          hint={`${Math.round((available / Math.max(1, capacity)) * 100)}% free`}
          level={available < capacity * 0.2 ? "WARNING" : "NORMAL"}
          live
        />
        <KpiCard
          label="People told to move"
          value={sim.evacuationOrders
            .filter((o) => o.status === "ACTIVE")
            .reduce((n, o) => n + o.exposedPopulation, 0)
            .toLocaleString()}
          hint={`${sim.evacuationOrders.filter((o) => o.status === "ACTIVE").length} active orders`}
          level={sim.evacuationOrders.some((o) => o.status === "ACTIVE") ? "CRITICAL" : "NORMAL"}
          live
        />
        <KpiCard label="Roads blocked / risky" value={blocked} level={blocked > 0 ? "WATCH" : "NORMAL"} live />
      </div>

      <EvacuationOrderPanel onFocusLocation={sim.setSelectedLocationId} />


      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Evacuation network" subtitle="Routes, shelters and road status" className="xl:col-span-2" bodyClassName="p-2">
          <RiskMap
            height={460}
            {...(sim.selectedLocationId ? { focusId: sim.selectedLocationId } : {})}
            onSelect={sim.setSelectedLocationId}
          />
        </Panel>

        <Panel title={`Recommended routes${selected ? ` from ${selected.location.name}` : ""}`} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {routes.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{shelterName(r.shelter_id)}</span>
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase tracking-wider",
                      r.status === "SAFE" ? "text-normal" : r.status === "BLOCKED" ? "text-critical" : "text-watch",
                    )}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {r.distance_km.toFixed(1)} km · ~{r.estimated_time_minutes} min · flood {r.flood_risk} · landslide{" "}
                  {r.landslide_risk}
                </p>
                <div className="mt-2">
                  <StatBar
                    label="Route safety score"
                    value={r.route_safety_score}
                    tone={r.route_safety_score > 70 ? "normal" : r.route_safety_score > 45 ? "watch" : "critical"}
                  />
                </div>
              </li>
            ))}
            {routes.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                No prototype routes recorded for this origin.
              </li>
            )}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Shelter capacity" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Shelter", "Capacity", "Occupied", "Available", "Access", "Status"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left data-label">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sim.shelters.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="metric px-4 py-2">{s.capacity}</td>
                    <td className="metric px-4 py-2">{s.occupied}</td>
                    <td className="metric px-4 py-2">{s.available_capacity}</td>
                    <td className="px-4 py-2 text-muted-foreground">{s.accessibility}</td>
                    <td className="px-4 py-2">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Road accessibility" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Road", "Status", "Flood risk", "Landslide risk", "Access"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left data-label">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sim.roads.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td
                      className={cn(
                        "px-4 py-2 font-mono text-[10px] uppercase",
                        r.status === "OPEN" ? "text-normal" : "text-critical",
                      )}
                    >
                      {r.status}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.flood_risk}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.landslide_risk}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.accessibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
