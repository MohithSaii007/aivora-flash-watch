import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import { EmptyState, KpiCard, Panel, PrototypeNotice } from "@/components/aivora/primitives";
import { HumanDecisionNotice } from "@/components/aivora/insight";
import { Button } from "@/components/ui/button";
import { useSimulation } from "@/lib/aivora/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/emergency-actions")({
  head: () => ({
    meta: [
      { title: "Emergency Action Center — AIVORA" },
      {
        name: "description",
        content:
          "Prioritised recommended response actions for flash flood events: evacuation, road closure, team deployment and shelter activation.",
      },
      { property: "og:title", content: "Emergency Action Center — AIVORA" },
      {
        property: "og:description",
        content: "Prioritised, explainable emergency response recommendations for control-room officers.",
      },
    ],
  }),
  component: ActionsPage,
});

const STATUSES = ["PENDING", "IN PROGRESS", "COMPLETED"] as const;

function ActionsPage() {
  const sim = useSimulation();
  const actions = [...sim.actions].sort((a, b) => a.priority - b.priority);

  const pending = actions.filter((a) => a.status === "PENDING").length;
  const progress = actions.filter((a) => a.status === "IN PROGRESS").length;
  const done = actions.filter((a) => a.status === "COMPLETED").length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Emergency Action Center</h1>
          <p className="text-xs text-muted-foreground">
            Actions are generated automatically for warning and critical conditions
          </p>
        </div>
        <PrototypeNotice />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total recommendations" value={actions.length} live />
        <KpiCard label="Pending" value={pending} level={pending ? "WARNING" : "NORMAL"} />
        <KpiCard label="In progress" value={progress} level={progress ? "WATCH" : "NORMAL"} />
        <KpiCard label="Completed" value={done} />
      </div>

      <HumanDecisionNotice />

      {actions.length === 0 ? (
        <EmptyState
          title="No emergency actions required"
          body="Conditions are within normal limits. Recommended actions appear here as soon as a location reaches warning level."
          icon={<ClipboardList className="size-5 text-muted-foreground" />}
        />
      ) : (
        <Panel title="Prioritised action list" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {actions.map((a) => (
              <li key={a.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "metric rounded-md px-2 py-0.5 text-[11px]",
                          a.priority === 1
                            ? "bg-critical/20 text-critical"
                            : a.priority === 2
                              ? "bg-warning/20 text-warning"
                              : "bg-secondary text-muted-foreground",
                        )}
                      >
                        P{a.priority}
                      </span>
                      <h3 className="text-sm font-semibold">{a.action}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.locationName} · {a.reason}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={a.status === s ? "default" : "secondary"}
                        onClick={() => sim.setActionStatus(a.id, s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Standard response playbook" subtitle="Reference sequence used to generate recommendations">
        <ol className="space-y-2 text-xs text-muted-foreground">
          {[
            "Verify sensor readings and confirm the alert with field responders.",
            "Notify village-level volunteers and community responders.",
            "Move residents from low-lying and streamside houses to higher ground.",
            "Close vulnerable bridges and landslide-prone road segments.",
            "Activate the nearest shelter and confirm available capacity.",
            "Deploy rescue and medical teams towards the highest-risk cluster.",
            "Coordinate with district and state disaster management authorities.",
            "Log every decision for post-event review.",
          ].map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="metric text-primary">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
