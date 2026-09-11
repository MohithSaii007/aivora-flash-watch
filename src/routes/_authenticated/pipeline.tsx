import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { LiveIndicator, Panel, PrototypeNotice } from "@/components/aivora/primitives";
import { useSimulation } from "@/lib/aivora/store";
import { MODEL_VERSION, RISK_WEIGHTS } from "@/lib/aivora/engine";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "AI Pipeline — AIVORA" },
      {
        name: "description",
        content:
          "How AIVORA turns sensor data into decisions: ingestion, feature engineering, prediction, risk scoring, alerting and response.",
      },
      { property: "og:title", content: "AI Pipeline — AIVORA" },
      {
        property: "og:description",
        content: "End-to-end visualisation of the AIVORA flash flood intelligence pipeline.",
      },
    ],
  }),
  component: PipelinePage,
});

const STAGES = [
  ["Sensor ingestion", "Rainfall, river, soil and weather readings arrive on a fixed cycle."],
  ["Validation & quality", "Stale, offline or implausible readings are flagged before use."],
  ["Feature engineering", "Rolling rainfall windows, rates of change, terrain and vulnerability features."],
  ["Prediction", "Composite model outputs flood probability with confidence and uncertainty."],
  ["Risk scoring", "0–100 score classified into normal, watch, warning or critical."],
  ["Lead-time estimation", "River rise rate projected against the critical threshold."],
  ["Alert generation", "Threshold crossings raise location-specific alerts."],
  ["Response intelligence", "Evacuation routes, shelters and prioritised emergency actions."],
];

function PipelinePage() {
  const sim = useSimulation();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">AI Pipeline</h1>
          <p className="text-xs text-muted-foreground">
            Model {MODEL_VERSION} · cycle {Math.round(sim.refreshMs / 1000)}s · tick {sim.tick}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator label={sim.running ? "PIPELINE ACTIVE" : "PIPELINE PAUSED"} tone={sim.running ? "normal" : "watch"} />
          <PrototypeNotice />
        </div>
      </header>

      <Panel title="Processing stages" subtitle="Each cycle runs the full chain for every monitored location">
        <ol className="grid gap-2 lg:grid-cols-2">
          {STAGES.map(([title, body], i) => (
            <li key={title} className="flex items-start gap-3 rounded-md border border-border bg-surface-2 px-3 py-3">
              <span className="metric mt-0.5 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold">{title}</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{body}</p>
              </div>
              <ArrowRight className="ml-auto mt-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Conceptual model weights" subtitle="Relative influence of each feature family">
          <ul className="space-y-2 text-xs">
            {Object.entries(RISK_WEIGHTS).map(([k, v]) => (
              <li key={k} className="flex items-center gap-3">
                <span className="w-40 shrink-0 capitalize text-muted-foreground">{k}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(Number(v) * 100 * 3)}%` }}
                  />
                </span>
                <span className="metric w-10 text-right">{Math.round(Number(v) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Planned production stack" subtitle="What replaces the prototype engine">
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>· MQTT broker ingesting ESP32 / LoRa field nodes</li>
            <li>· FastAPI inference service with XGBoost and LSTM ensembles</li>
            <li>· SHAP explainability served alongside every prediction</li>
            <li>· PostGIS for catchment, slope and hydrological routing</li>
            <li>· IMD and satellite rainfall nowcasting as additional features</li>
            <li>· SMS, WhatsApp and IVR delivery for last-mile warnings</li>
          </ul>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            None of these are connected in this prototype.
          </p>
        </Panel>
      </div>
    </div>
  );
}
