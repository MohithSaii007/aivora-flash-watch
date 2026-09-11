import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { EmptyState, KpiCard, Panel, PrototypeNotice } from "@/components/aivora/primitives";
import { CategoryBarChart } from "@/components/aivora/charts";
import { getHistoricalEvents } from "@/services/aivoraApi";
import { useSimulation } from "@/lib/aivora/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/historical")({
  head: () => ({
    meta: [
      { title: "Historical Events — AIVORA" },
      {
        name: "description",
        content:
          "Past flash flood and landslide events with rainfall, water levels, affected population and infrastructure damage for model context.",
      },
      { property: "og:title", content: "Historical Events — AIVORA" },
      {
        property: "og:description",
        content: "Historical flash flood record used to contextualise current hyper-local risk.",
      },
    ],
  }),
  component: HistoricalPage,
});

function HistoricalPage() {
  const sim = useSimulation();
  const { data, isLoading, error } = useQuery({
    queryKey: ["historical-events"],
    queryFn: getHistoricalEvents,
  });

  const events = data ?? [];
  const name = (id: string | null) =>
    (id && sim.locations.find((l) => l.id === id)?.name) || "District-wide";

  const floods = events.filter((e) => e.flood_occurred).length;
  const landslides = events.filter((e) => e.landslide_occurred).length;
  const affected = events.reduce((n, e) => n + e.affected_population, 0);
  const maxRain = events.reduce((n, e) => Math.max(n, e.rainfall), 0);

  const byYear = Object.entries(
    events.reduce<Record<string, number>>((acc, e) => {
      const y = new Date(e.event_date).getFullYear().toString();
      acc[y] = (acc[y] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Historical Events</h1>
          <p className="text-xs text-muted-foreground">
            Recorded prototype events used to weight historical flood frequency in the risk engine
          </p>
        </div>
        <PrototypeNotice />
      </header>

      {isLoading ? (
        <div className="panel h-64 animate-pulse" />
      ) : error ? (
        <EmptyState
          title="Historical record unavailable"
          body="The prototype dataset could not be loaded. No values are shown rather than displaying fabricated history."
          icon={<History className="size-5 text-muted-foreground" />}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Recorded events" value={events.length} />
            <KpiCard label="Flood events" value={floods} level="WARNING" />
            <KpiCard label="Landslide events" value={landslides} level="WATCH" />
            <KpiCard label="Population affected" value={affected.toLocaleString()} hint={`Peak rainfall ${maxRain.toFixed(0)} mm`} />
          </div>

          <Panel title="Events per year">
            <CategoryBarChart data={byYear} color="var(--color-chart-1)" height={230} />
          </Panel>

          <Panel title="Event log" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      "Date",
                      "Location",
                      "Rainfall",
                      "Water level",
                      "Severity",
                      "Flood",
                      "Landslide",
                      "Area",
                      "Affected",
                      "Damage",
                    ].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left data-label">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-accent/30">
                      <td className="whitespace-nowrap px-4 py-2 metric">
                        {new Date(e.event_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 font-medium">{name(e.location_id)}</td>
                      <td className="metric px-4 py-2">{e.rainfall.toFixed(0)} mm</td>
                      <td className="metric px-4 py-2">{e.historical_water_level.toFixed(1)} m</td>
                      <td
                        className={cn(
                          "px-4 py-2 font-mono text-[10px] uppercase",
                          e.severity === "CRITICAL" || e.severity === "SEVERE" ? "text-critical" : "text-watch",
                        )}
                      >
                        {e.severity}
                      </td>
                      <td className="px-4 py-2">{e.flood_occurred ? "Yes" : "No"}</td>
                      <td className="px-4 py-2">{e.landslide_occurred ? "Yes" : "No"}</td>
                      <td className="metric px-4 py-2">{e.affected_area.toFixed(1)} km²</td>
                      <td className="metric px-4 py-2">{e.affected_population.toLocaleString()}</td>
                      <td className="max-w-[220px] px-4 py-2 text-muted-foreground">
                        {e.infrastructure_damage ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
