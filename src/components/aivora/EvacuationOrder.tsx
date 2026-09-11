import { useState } from "react";
import { Check, Copy, Megaphone, Users } from "lucide-react";
import { toast } from "sonner";

import { Panel, RiskBadge } from "@/components/aivora/primitives";
import { useSimulation } from "@/lib/aivora/store";
import { exposedPopulation, nearestShelters } from "@/lib/aivora/evacuation";
import { cn } from "@/lib/utils";

/**
 * Mass evacuation broadcast: order one village or every at-risk village,
 * with head counts and the nearest safe shelters for each.
 */
export function EvacuationOrderPanel({ onFocusLocation }: { onFocusLocation?: (id: string) => void }) {
  const sim = useSimulation();
  const [copied, setCopied] = useState<string | null>(null);

  const selected = sim.live[sim.selectedLocationId];
  const atRisk = Object.values(sim.live).filter((s) => s.prediction.riskScore >= sim.thresholds.warning);
  const atRiskPeople = atRisk.reduce((n, s) => n + exposedPopulation(s), 0);
  const active = sim.evacuationOrders.filter((o) => o.status === "ACTIVE");
  const activePeople = active.reduce((n, o) => n + o.exposedPopulation, 0);

  const preview = selected ? nearestShelters(selected.location, sim.shelters) : [];
  const previewPeople = selected ? exposedPopulation(selected) : 0;

  const copy = async (order: { id: string; message: string }) => {
    try {
      await navigator.clipboard.writeText(order.message);
      setCopied(order.id);
      window.setTimeout(() => setCopied(null), 2000);
      toast.success("Warning message copied");
    } catch {
      toast.error("Could not copy the message");
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title="Issue evacuation order"
        subtitle="Tells every household where to go, and how many people must move"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              if (!selected) return;
              sim.orderEvacuation(selected.location.id);
              toast.success(`Evacuation ordered for ${selected.location.name}`);
            }}
            disabled={!selected}
            className="flex items-start gap-3 rounded-md border border-critical/50 bg-critical/10 px-3 py-3 text-left transition hover:bg-critical/20 disabled:opacity-50"
          >
            <Megaphone className="mt-0.5 size-4 shrink-0 text-critical" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-critical">
                Evacuate {selected?.location.name ?? "selected village"} now
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {previewPeople.toLocaleString()} of {(selected?.location.population ?? 0).toLocaleString()} people ·
                nearest shelter {preview[0]?.name ?? "not available"}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              const n = sim.orderDistrictEvacuation();
              if (n === 0) toast.info("No village is currently above the warning level");
              else toast.success(`Evacuation ordered for ${n} villages`);
            }}
            disabled={atRisk.length === 0}
            className="flex items-start gap-3 rounded-md border border-warning/50 bg-warning/10 px-3 py-3 text-left transition hover:bg-warning/20 disabled:opacity-50"
          >
            <Users className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-warning">District-wide evacuation order</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {atRisk.length} villages above warning · {atRiskPeople.toLocaleString()} people most exposed
              </span>
            </span>
          </button>
        </div>

        {selected && (
          <div className="mt-3 rounded-md border border-border bg-surface-2 p-3">
            <p className="data-label">Nearest safe places for {selected.location.name}</p>
            <ul className="mt-2 space-y-1.5">
              {preview.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium">{s.name}</span>
                  <span className="metric text-[10px] text-muted-foreground">
                    {s.distanceKm.toFixed(1)} km · {s.walkMinutes} min walk · {s.driveMinutes} min drive ·{" "}
                    {s.availableCapacity.toLocaleString()} free
                  </span>
                </li>
              ))}
              {preview.length === 0 && (
                <li className="text-xs text-muted-foreground">No shelter recorded in this prototype.</li>
              )}
            </ul>
          </div>
        )}
      </Panel>

      <PublicAlertShare />


      <Panel
        title="Live evacuation orders"
        subtitle={
          active.length
            ? `${active.length} active · ${activePeople.toLocaleString()} people told to move`
            : "No evacuation order is currently active"
        }
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border">
          {sim.evacuationOrders.map((o) => (
            <li key={o.id} className={cn("px-4 py-3", o.status !== "ACTIVE" && "opacity-60")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-sm font-semibold hover:underline"
                  onClick={() => onFocusLocation?.(o.locationId)}
                >
                  {o.locationName}
                </button>
                <div className="flex items-center gap-2">
                  <RiskBadge level={o.riskLevel} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {o.status}
                  </span>
                </div>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div className="rounded-md bg-surface-2 px-2.5 py-2">
                  <p className="data-label">People to move</p>
                  <p className="metric text-base text-critical">{o.exposedPopulation.toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-surface-2 px-2.5 py-2">
                  <p className="data-label">Village population</p>
                  <p className="metric text-base">{o.totalPopulation.toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-surface-2 px-2.5 py-2">
                  <p className="data-label">Time available</p>
                  <p className="metric text-base">
                    {o.leadTimeMinutes && o.leadTimeMinutes > 0 ? `${o.leadTimeMinutes} min` : "—"}
                  </p>
                </div>
              </div>

              <ul className="mt-2 space-y-1">
                {o.shelters.map((s, i) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>
                      <span className="metric mr-2 text-[10px] text-primary">{i === 0 ? "GO TO" : "ALT"}</span>
                      {s.name}
                    </span>
                    <span className="metric text-[10px] text-muted-foreground">
                      {s.distanceKm.toFixed(1)} km · {s.walkMinutes} min walk · {s.availableCapacity.toLocaleString()}{" "}
                      free · {s.accessibility}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-2 rounded-md border border-border bg-surface-2 px-2.5 py-2 text-[11px] leading-relaxed">
                {o.message}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copy(o)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] transition hover:bg-surface-2"
                >
                  {copied === o.id ? (
                    <Check className="size-3 text-normal" aria-hidden="true" />
                  ) : (
                    <Copy className="size-3" aria-hidden="true" />
                  )}
                  Copy warning message
                </button>
                {o.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => sim.standDownOrder(o.id)}
                    className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-surface-2"
                  >
                    Stand down
                  </button>
                )}
              </div>
            </li>
          ))}
          {sim.evacuationOrders.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-muted-foreground">
              Select a village and issue an order, or trigger a district-wide evacuation.
            </li>
          )}
        </ul>
        {sim.evacuationOrders.length > 0 && (
          <div className="border-t border-border px-4 py-2.5">
            <button
              type="button"
              onClick={sim.clearEvacuationOrders}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear order log
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
