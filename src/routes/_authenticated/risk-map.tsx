import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";

import { Panel, PrototypeNotice, RiskBadge } from "@/components/aivora/primitives";
import { RiskMap } from "@/components/aivora/RiskMap";
import { Input } from "@/components/ui/input";
import { useSimulation } from "@/lib/aivora/store";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/aivora/types";

export const Route = createFileRoute("/_authenticated/risk-map")({
  head: () => ({
    meta: [
      { title: "Live Risk Map — AIVORA" },
      {
        name: "description",
        content:
          "Interactive hyper-local GIS risk map with villages, rivers, roads, IoT sensors, shelters, landslide zones and evacuation routes.",
      },
      { property: "og:title", content: "Live Risk Map — AIVORA" },
      {
        property: "og:description",
        content: "Village, ward, grid and catchment level flash flood risk on one interactive map.",
      },
    ],
  }),
  component: RiskMapPage,
});

const SCALES = ["Village", "Ward", "Grid", "Catchment"] as const;
const FILTERS: Array<RiskLevel | "ALL"> = ["ALL", "CRITICAL", "WARNING", "WATCH", "NORMAL"];

function RiskMapPage() {
  const sim = useSimulation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RiskLevel | "ALL">("ALL");
  const [scale, setScale] = useState<(typeof SCALES)[number]>("Village");

  const states = Object.values(sim.live)
    .filter((s) => s.location.name.toLowerCase().includes(query.toLowerCase()))
    .filter((s) => filter === "ALL" || s.prediction.riskLevel === filter)
    .sort((a, b) => b.prediction.riskScore - a.prediction.riskScore);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Live GIS Risk Map</h1>
          <p className="text-xs text-muted-foreground">
            Hyper-local risk at {scale.toLowerCase()} level · Devraan district
          </p>
        </div>
        <PrototypeNotice />
      </header>

      <div className="grid gap-4 xl:grid-cols-4">
        <Panel className="xl:col-span-3" bodyClassName="p-2">
          <RiskMap
            height={620}
            {...(sim.selectedLocationId ? { focusId: sim.selectedLocationId } : {})}
            onSelect={sim.setSelectedLocationId}
          />
        </Panel>

        <div className="space-y-4">
          <Panel title="Map controls">
            <label className="block">
              <span className="data-label">Search location</span>
              <div className="relative mt-1.5">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Kanora, Bhimtal…"
                  className="pl-8"
                />
              </div>
            </label>

            <div className="mt-4">
              <span className="data-label">Analysis scale</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SCALES.map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setScale(sc)}
                    aria-pressed={scale === sc}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[11px]",
                      scale === sc
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-secondary",
                    )}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <span className="data-label">Risk filter</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={cn(
                      "rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase",
                      filter === f
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-secondary",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title={`Locations (${states.length})`} bodyClassName="p-0">
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {states.map((s) => (
                <li key={s.location.id}>
                  <button
                    onClick={() => sim.setSelectedLocationId(s.location.id)}
                    className={cn(
                      "w-full px-4 py-2.5 text-left transition-colors hover:bg-accent/40",
                      s.location.id === sim.selectedLocationId && "bg-accent/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-medium">{s.location.name}</span>
                      <RiskBadge level={s.prediction.riskLevel} />
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      score {s.prediction.riskScore} · {s.prediction.probability}% · pop{" "}
                      {s.location.population.toLocaleString()} · {s.location.elevation} m
                    </p>
                  </button>
                </li>
              ))}
              {states.length === 0 && (
                <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No locations match this filter.
                </li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
