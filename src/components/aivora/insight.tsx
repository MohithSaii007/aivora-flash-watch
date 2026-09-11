import { AlertTriangle, Battery, CheckCircle2, Clock, Signal, TrendingDown, TrendingUp } from "lucide-react";

import { Panel, RiskBadge, Freshness, LiveIndicator, StatBar } from "./primitives";
import { HorizontalContributionChart } from "./charts";
import { Button } from "@/components/ui/button";
import { CRITICAL_RIVER_LEVEL, RISK_META } from "@/lib/aivora/engine";
import { useSimulation } from "@/lib/aivora/store";
import type { AlertRecord, LocationLiveState, SensorLiveState } from "@/lib/aivora/types";
import { cn } from "@/lib/utils";

export function LocationSelector({ label = "Location" }: { label?: string }) {
  const { locations, selectedLocationId, setSelectedLocationId, live } = useSimulation();
  return (
    <label className="flex items-center gap-2">
      <span className="data-label">{label}</span>
      <select
        value={selectedLocationId}
        onChange={(e) => setSelectedLocationId(e.target.value)}
        className="rounded-md border border-input bg-secondary px-2.5 py-1.5 text-xs text-foreground"
      >
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name} — {live[l.id]?.prediction.riskScore ?? 0} {live[l.id]?.prediction.riskLevel ?? ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LeadTimeCard({ state }: { state: LocationLiveState }) {
  const lead = state.prediction.leadTimeMinutes;
  const meta = RISK_META[state.prediction.riskLevel];
  return (
    <Panel
      title="Actionable lead time"
      subtitle="Time until river reaches the critical threshold"
      action={<LiveIndicator label="MODEL ACTIVE" />}
    >
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <div className="flex items-baseline gap-2">
            <span className={cn("metric text-5xl", meta.text)}>{lead === null ? "—" : lead}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {lead === null ? "no rise detected" : "minutes"}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Uncertainty ±{state.prediction.uncertainty} min · Confidence {state.prediction.confidence}%
          </p>
        </div>
        <div className="grid flex-1 gap-2 text-xs sm:grid-cols-2">
          <Metric label="Critical threshold" value={`${CRITICAL_RIVER_LEVEL.toFixed(1)} m`} />
          <Metric label="Current river level" value={`${state.features.riverLevel.toFixed(2)} m`} />
          <Metric label="Rate of rise" value={`${state.features.riverRiseRate.toFixed(3)} m/min`} />
          <Metric
            label="Estimated threshold time"
            value={lead === null ? "not applicable" : `~${lead} min`}
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-md border border-watch/40 bg-watch/10 px-3 py-2">
        <Clock className="size-3.5 shrink-0 text-watch" aria-hidden="true" />
        <p className="text-[11px] text-watch">
          Estimated lead time — not guaranteed. Conditions can change faster than modelled.
        </p>
      </div>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2">
      <span className="data-label">{label}</span>
      <p className="metric mt-0.5 text-sm">{value}</p>
    </div>
  );
}

export function ExplainabilityPanel({ state }: { state: LocationLiveState }) {
  const palette = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)",
    "var(--color-info)",
  ];
  const data = state.prediction.contributions.map((c, i) => ({
    label: c.feature,
    value: c.weight,
    color: palette[i % palette.length] ?? "var(--color-primary)",
  }));

  return (
    <Panel
      title="Explainable AI — why is this alert active?"
      subtitle="Feature contribution to the current prediction (SHAP-style attribution)"
    >
      <HorizontalContributionChart data={data} />
      <p className="mt-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs text-muted-foreground">
        {state.prediction.explanation}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Prototype AI simulation · model {state.prediction.modelVersion}
      </p>
    </Panel>
  );
}

export function AlertCard({
  alert,
  locationName,
  onView,
}: {
  alert: AlertRecord;
  locationName: string;
  onView?: () => void;
}) {
  const { acknowledgeAlert, escalateAlert } = useSimulation();
  return (
    <article className={cn("panel p-4", alert.risk_level === "CRITICAL" && "border-critical/50")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RiskBadge level={alert.risk_level} size="md" />
          <h3 className="text-sm font-semibold">{alert.alert_type}</h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {alert.status} · {new Date(alert.created_at).toLocaleTimeString()}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{alert.message}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Location" value={locationName} />
        <Metric label="Probability" value={`${Math.round(alert.probability)}%`} />
        <Metric
          label="Lead time"
          value={alert.lead_time === null ? "n/a" : `~${alert.lead_time} min`}
        />
        <Metric label="Risk" value={alert.risk_level} />
      </dl>
      {alert.recommended_action && (
        <p className="mt-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Recommended action: {alert.recommended_action}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => acknowledgeAlert(alert.id)}
          disabled={alert.status !== "ACTIVE"}
        >
          <CheckCircle2 className="size-3.5" /> Acknowledge
        </Button>
        <Button size="sm" variant="secondary" onClick={() => escalateAlert(alert.id)}>
          <AlertTriangle className="size-3.5" /> Escalate
        </Button>
        {onView && (
          <Button size="sm" variant="ghost" onClick={onView}>
            View location
          </Button>
        )}
      </div>
    </article>
  );
}

export function SensorCard({ s }: { s: SensorLiveState }) {
  const tone =
    s.status === "ONLINE"
      ? "normal"
      : s.status === "OFFLINE" || s.status === "NO DATA"
        ? "critical"
        : "watch";
  return (
    <article className="panel p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-mono text-sm font-semibold">{s.sensor.sensor_id}</h3>
          <p className="text-[11px] text-muted-foreground">{s.sensor.sensor_type}</p>
        </div>
        <LiveIndicator label={s.status} tone={tone === "normal" ? "normal" : tone === "critical" ? "critical" : "watch"} />
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="metric text-2xl">{s.value.toFixed(1)}</span>
        <span className="font-mono text-xs text-muted-foreground">{s.unit}</span>
        {s.trend !== 0 && (
          <span
            className={cn(
              "ml-1 inline-flex items-center gap-0.5 font-mono text-[10px]",
              s.trend > 0 ? "text-warning" : "text-normal",
            )}
          >
            {s.trend > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(s.trend).toFixed(2)}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <StatBar
          label="Battery"
          value={s.battery}
          unit="%"
          tone={s.battery < 20 ? "critical" : s.battery < 45 ? "watch" : "normal"}
        />
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Signal className="size-3" /> {s.connectivity}
          </span>
          <span className="inline-flex items-center gap-1">
            <Battery className="size-3" /> {s.quality}
          </span>
        </div>
        <Freshness ts={s.lastUpdate} />
      </div>
    </article>
  );
}

export function ResponsibleAiPanel() {
  return (
    <Panel title="Responsible AI & prototype scope">
      <ul className="space-y-2 text-xs text-muted-foreground">
        <li>· AIVORA is a decision-support prototype, not an official warning service.</li>
        <li>· Predictions contain uncertainty and every lead time is an estimate.</li>
        <li>· The system does not replace authorised disaster-management agencies.</li>
        <li>· All emergency decisions remain with authorised personnel.</li>
        <li>· All data shown here is simulated prototype data, clearly labelled as such.</li>
        <li>· No live government forecasting system is connected in this prototype.</li>
      </ul>
    </Panel>
  );
}

export function HumanDecisionNotice() {
  return (
    <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-primary">
      Human decision required — AIVORA recommends, authorised personnel decide.
    </p>
  );
}
