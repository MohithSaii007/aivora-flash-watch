import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Panel, PrototypeNotice } from "@/components/aivora/primitives";
import { ResponsibleAiPanel } from "@/components/aivora/insight";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useSimulation } from "@/lib/aivora/store";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_THRESHOLDS } from "@/lib/aivora/engine";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AIVORA" },
      {
        name: "description",
        content:
          "Configure risk thresholds, refresh interval, notification preferences and review your control-room account role.",
      },
      { property: "og:title", content: "Settings — AIVORA" },
      {
        property: "og:description",
        content: "Threshold tuning and account settings for the AIVORA control room.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const sim = useSimulation();
  const { user, role, roleLabel } = useAuth();
  const [t, setT] = useState(sim.thresholds);
  const [refresh, setRefresh] = useState(Math.round(sim.refreshMs / 1000));

  const save = () => {
    if (!(t.watch < t.warning && t.warning < t.critical)) {
      toast.error("Thresholds must increase: watch < warning < critical.");
      return;
    }
    sim.setThresholds(t);
    sim.setRefreshMs(refresh * 1000);
    toast.success("Settings applied to the live prediction engine.");
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="text-xs text-muted-foreground">Tune how AIVORA classifies and refreshes risk</p>
        </div>
        <PrototypeNotice />
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Risk thresholds" subtitle="Risk score boundaries used for classification and alerting">
          <div className="space-y-5">
            {(
              [
                ["watch", "Watch"],
                ["warning", "Warning"],
                ["critical", "Critical"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="flex items-center justify-between">
                  <span className="data-label">{label} threshold</span>
                  <span className="metric text-sm">{t[key]}</span>
                </span>
                <Slider
                  className="mt-3"
                  value={[t[key]]}
                  min={5}
                  max={99}
                  step={1}
                  onValueChange={([v]) => setT((p) => ({ ...p, [key]: v ?? p[key] }))}
                />
              </label>
            ))}
            <label className="block">
              <span className="flex items-center justify-between">
                <span className="data-label">Refresh interval</span>
                <span className="metric text-sm">{refresh}s</span>
              </span>
              <Slider
                className="mt-3"
                value={[refresh]}
                min={2}
                max={30}
                step={1}
                onValueChange={([v]) => setRefresh(v ?? refresh)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save}>Apply settings</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setT(DEFAULT_THRESHOLDS);
                  setRefresh(5);
                }}
              >
                Restore defaults
              </Button>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Account">
            <dl className="space-y-2 text-xs">
              <Row label="Signed in as" value={user?.email ?? "—"} />
              <Row label="Role" value={roleLabel} />
              <Row label="Role key" value={role ?? "—"} />
              <Row label="Simulation engine" value={sim.running ? "Running" : "Paused"} />
              <Row label="Connectivity" value={sim.connectivity} />
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Roles are stored separately from your profile and control which sections you can open.
            </p>
          </Panel>
          <ResponsibleAiPanel />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="metric">{value}</dd>
    </div>
  );
}
