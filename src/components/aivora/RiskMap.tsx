import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import { Layers, Maximize2, Minimize2 } from "lucide-react";

import type { MapLayers } from "./RiskMapCanvas";
import { LiveIndicator } from "./primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RiskMapCanvas = lazy(() => import("./RiskMapCanvas"));

const DEFAULT_LAYERS: MapLayers = {
  riskZones: true,
  villages: true,
  rivers: true,
  roads: true,
  sensors: true,
  shelters: true,
  evacuation: true,
  landslide: false,
  infrastructure: false,
};

const LAYER_LABELS: Array<[keyof MapLayers, string]> = [
  ["riskZones", "Risk zones"],
  ["villages", "Villages & wards"],
  ["rivers", "Rivers & streams"],
  ["roads", "Roads & bridges"],
  ["sensors", "IoT sensors"],
  ["shelters", "Shelters"],
  ["evacuation", "Evacuation route"],
  ["landslide", "Landslide zones"],
  ["infrastructure", "Schools & hospitals"],
];

function MapFallback({ height }: { height: number }) {
  return (
    <div
      className="grid-backdrop flex items-center justify-center rounded-lg border border-border bg-surface"
      style={{ height }}
    >
      <span className="data-label animate-pulse">Loading GIS layers…</span>
    </div>
  );
}

export function RiskMap({
  height = 520,
  focusId,
  onSelect,
  compact,
}: {
  height?: number;
  focusId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
}) {
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_LAYERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const mapHeight = expanded ? 780 : height;

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-[500] flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
          >
            <Layers className="size-3.5" aria-hidden="true" /> Layers
          </Button>
          {!compact && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Shrink map" : "Expand map"}
            >
              {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </Button>
          )}
        </div>
        {panelOpen && (
          <div className="panel w-56 space-y-1.5 p-3">
            {LAYER_LABELS.map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={layers[key]}
                  onChange={(e) => setLayers((l) => ({ ...l, [key]: e.target.checked }))}
                  className="size-3.5 accent-[var(--color-primary)]"
                />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 z-[500] panel px-3 py-2">
        <span className="data-label">Risk legend</span>
        <ul className="mt-1.5 space-y-1">
          {[
            ["normal", "GREEN — Normal"],
            ["watch", "YELLOW — Watch"],
            ["warning", "ORANGE — Warning"],
            ["critical", "RED — Critical"],
          ].map(([token, label]) => (
            <li key={token} className="flex items-center gap-2 text-[11px]">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  token === "normal" && "bg-normal",
                  token === "watch" && "bg-watch",
                  token === "warning" && "bg-warning",
                  token === "critical" && "bg-critical",
                )}
                aria-hidden="true"
              />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute left-3 top-3 z-[500] panel px-3 py-1.5">
        <LiveIndicator label="GIS LIVE" />
      </div>

      <ClientOnly fallback={<MapFallback height={mapHeight} />}>
        <Suspense fallback={<MapFallback height={mapHeight} />}>
          <RiskMapCanvas
            layers={layers}
            height={mapHeight}
            {...(focusId ? { focusId } : {})}
            {...(onSelect ? { onSelect } : {})}
          />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
