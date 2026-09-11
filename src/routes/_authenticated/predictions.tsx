import { createFileRoute } from "@tanstack/react-router";

import { KpiCard, Panel, PrototypeNotice, RiskBadge, RiskScoreGauge } from "@/components/aivora/primitives";
import { ExplainabilityPanel, HumanDecisionNotice, LeadTimeCard, LocationSelector } from "@/components/aivora/insight";
import { RealtimeLineChart } from "@/components/aivora/charts";
import { useSimulation } from "@/lib/aivora/store";

export const Route = createFileRoute("/_authenticated/predictions")({
  head: () => ({
    meta: [
      { title: "Prediction Engine — AIVORA" },
      {
        name: "description",
        content:
          "Flash flood probability, risk score, lead-time estimation, confidence, uncertainty and feature contributions per location.",
      },
      { property: "og:title", content: "Prediction Engine — AIVORA" },
      {
        property: "og:description",
        content: "Explainable flash flood prediction output with lead time and confidence bands.",
      },
    ],
  }),
  component: PredictionsPage,
});

function PredictionsPage() {
  const sim = useSimulation();
  const state = sim.live[sim.selectedLocationId];

  if (!state) return <div className="panel h-64 animate-pulse" />;

  const trend = state.history.map((h, i) => ({
    label: `${i}`,
    probability: Math.round(h.probability),
    upper: Math.min(100, Math.round(h.probability + state.prediction.uncertainty / 2)),
    lower: Math.max(0, Math.round(h.probability - state.prediction.uncertainty / 2)),
    river: Number(h.river.toFixed(2)),
  }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Prediction Engine</h1>
          <p className="text-xs text-muted-foreground">
            Model {state.prediction.modelVersion} · updated every {Math.round(sim.refreshMs / 1000)}s
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LocationSelector />
          <PrototypeNotice />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Flood probability" value={`${state.prediction.probability}%`} level={state.prediction.riskLevel} live />
        <KpiCard label="Risk score" value={state.prediction.riskScore} hint="0–100 composite" level={state.prediction.riskLevel} live />
        <KpiCard
          label="Lead time"
          value={state.prediction.leadTimeMinutes === null ? "—" : state.prediction.leadTimeMinutes}
          unit={state.prediction.leadTimeMinutes === null ? "" : "min"}
          hint="Estimated, not guaranteed"
          live
        />
        <KpiCard label="Confidence" value={`${state.prediction.confidence}%`} hint={`± ${state.prediction.uncertainty} min`} live />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={`${state.location.name} — current classification`}>
          <RiskScoreGauge score={state.prediction.riskScore} level={state.prediction.riskLevel} />
          <div className="mt-4 flex items-center justify-between">
            <span className="data-label">Severity</span>
            <RiskBadge level={state.prediction.riskLevel} size="md" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{state.prediction.severity}</p>
          <div className="mt-4">
            <HumanDecisionNotice />
          </div>
        </Panel>

        <Panel
          title="Probability forecast with uncertainty band"
          subtitle="Dashed lines show the uncertainty envelope"
          className="xl:col-span-2"
        >
          <RealtimeLineChart
            data={trend}
            legend
            height={300}
            series={[
              { key: "probability", name: "Flood probability %", color: "var(--color-chart-4)" },
              { key: "upper", name: "Upper bound", color: "var(--color-warning)", dashed: true },
              { key: "lower", name: "Lower bound", color: "var(--color-info)", dashed: true },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <LeadTimeCard state={state} />
        <ExplainabilityPanel state={state} />
      </div>

      <Panel title="Model inputs used for this prediction" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left data-label">Feature</th>
                <th className="px-4 py-2.5 text-right data-label">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Rainfall intensity", `${state.features.rainfallIntensity.toFixed(1)} mm/hr`],
                ["Rainfall 1h / 3h / 24h", `${state.features.rainfall1h.toFixed(0)} / ${state.features.rainfall3h.toFixed(0)} / ${state.features.rainfall24h.toFixed(0)} mm`],
                ["Rainfall change rate", `${state.features.rainfallChangeRate.toFixed(2)} mm/hr per min`],
                ["Soil moisture", `${state.features.soilMoisture.toFixed(1)} %`],
                ["Soil moisture change", `${state.features.soilMoistureChange.toFixed(2)} %/min`],
                ["River level", `${state.features.riverLevel.toFixed(2)} m`],
                ["River rise rate", `${state.features.riverRiseRate.toFixed(3)} m/min`],
                ["Slope", `${state.features.slope.toFixed(1)} °`],
                ["Drainage density", state.features.drainageDensity.toFixed(2)],
                ["Distance from stream", `${state.features.distanceFromStream.toFixed(0)} m`],
                ["Historical flood frequency", state.features.historicalFrequency.toFixed(2)],
                ["Population vulnerability", state.features.vulnerability.toFixed(0)],
                ["Elevation", `${state.features.elevation.toFixed(0)} m`],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="px-4 py-2 text-muted-foreground">{k}</td>
                  <td className="metric px-4 py-2 text-right">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
