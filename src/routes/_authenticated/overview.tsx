import { createFileRoute } from "@tanstack/react-router";

import { KpiCard, Panel, PrototypeNotice, RiskBadge, RiskScoreGauge } from "@/components/aivora/primitives";
import { ExplainabilityPanel, LeadTimeCard, LocationSelector, ResponsibleAiPanel } from "@/components/aivora/insight";
import { RealtimeAreaChart } from "@/components/aivora/charts";
import { RiskMap } from "@/components/aivora/RiskMap";
import { useDistrictSummary, useSimulation } from "@/lib/aivora/store";
import { EmptyState } from "@/components/aivora/primitives";
import { riskLevelFromScore } from "@/lib/aivora/engine";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [
      { title: "Overview — AIVORA Flash Flood Intelligence Center" },
      {
        name: "description",
        content:
          "District overview of simulated flash flood risk: active alerts, rainfall, soil moisture, river level, flood probability and lead time.",
      },
      { property: "og:title", content: "Overview — AIVORA Flash Flood Intelligence Center" },
      {
        property: "og:description",
        content: "Live prototype control-room overview of hyper-local flash flood risk.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const sim = useSimulation();
  const s = useDistrictSummary();
  const selected = sim.selectedLocationId ? sim.live[sim.selectedLocationId] : undefined;

  if (!sim.ready) return <LoadingGrid />;
  if (sim.loadError)
    return (
      <EmptyState
        title="Prototype dataset unavailable"
        body={`${sim.loadError}. Showing no data rather than fabricated values.`}
      />
    );

  const chart = (selected?.history ?? []).map((h, i) => ({
    label: `${i}`,
    probability: Math.round(h.probability),
    rainfall: Math.round(h.rainfall),
    soil: Math.round(h.soil),
  }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">AIVORA — Flash Flood Intelligence Center</h1>
          <p className="text-xs text-muted-foreground">
            Devraan district, Himvat · Observe. Predict. Protect.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LocationSelector />
          <PrototypeNotice />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active alerts"
          value={s.activeAlerts}
          hint="Location-specific warnings"
          to="/alerts"
          level={s.activeAlerts > 0 ? "WARNING" : "NORMAL"}
          live
        />
        <KpiCard
          label="Current rainfall"
          value={s.rainfall.toFixed(0)}
          unit="mm/hr"
          hint="District average intensity"
          to="/sensors"
          live
        />
        <KpiCard
          label="Soil moisture"
          value={s.soil.toFixed(0)}
          unit="%"
          hint="Saturation across catchments"
          to="/sensors"
          live
        />
        <KpiCard
          label="River level"
          value={s.river.toFixed(1)}
          unit="m"
          hint="Critical threshold 4.5 m"
          to="/predictions"
          live
        />
        <KpiCard
          label="Flood probability"
          value={`${Math.round(s.maxProbability)}%`}
          hint={`Highest: ${s.worst?.location.name ?? "—"}`}
          to="/predictions"
          level={riskLevelFromScore(s.worst?.prediction.riskScore ?? 0, sim.thresholds)}
          live
        />
        <KpiCard
          label="Minimum lead time"
          value={s.minLeadTime === null ? "—" : s.minLeadTime}
          unit={s.minLeadTime === null ? "" : "min"}
          hint="Estimated, not guaranteed"
          to="/predictions"
          live
        />
        <KpiCard
          label="Vulnerable locations"
          value={s.vulnerableLocations}
          hint="At or above watch threshold"
          to="/vulnerability"
        />
        <KpiCard
          label="Active IoT sensors"
          value={`${s.sensorsOnline}/${s.sensorsTotal}`}
          hint="Field nodes reporting"
          to="/sensors"
          live
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Live GIS risk map"
          subtitle="Click a village to inspect hyper-local risk"
          className="xl:col-span-2"
          bodyClassName="p-2"
        >
          <RiskMap
            height={430}
            {...(sim.selectedLocationId ? { focusId: sim.selectedLocationId } : {})}
            onSelect={sim.setSelectedLocationId}
          />
        </Panel>

        <div className="space-y-4">
          {selected && (
            <Panel title={`Risk score — ${selected.location.name}`}>
              <RiskScoreGauge score={selected.prediction.riskScore} level={selected.prediction.riskLevel} />
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Cell label="Flood probability" value={`${selected.prediction.probability}%`} />
                <Cell label="Severity" value={selected.prediction.severity} />
                <Cell label="Confidence" value={`${selected.prediction.confidence}%`} />
                <Cell
                  label="Lead time"
                  value={
                    selected.prediction.leadTimeMinutes === null
                      ? "n/a"
                      : `~${selected.prediction.leadTimeMinutes} min`
                  }
                />
              </div>
            </Panel>
          )}
          <Panel title="Hyper-local risk ranking" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {[...s.states]
                .sort((a, b) => b.prediction.riskScore - a.prediction.riskScore)
                .map((st) => (
                  <li key={st.location.id}>
                    <button
                      onClick={() => sim.setSelectedLocationId(st.location.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/40"
                    >
                      <span className="min-w-0 truncate text-xs">{st.location.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="metric text-sm">{st.prediction.riskScore}</span>
                        <RiskBadge level={st.prediction.riskLevel} />
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </Panel>
        </div>
      </div>

      {selected && (
        <div className="grid gap-4 xl:grid-cols-2">
          <LeadTimeCard state={selected} />
          <ExplainabilityPanel state={selected} />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Live trend — next window"
          subtitle="Flood probability against rainfall and soil saturation"
          className="xl:col-span-2"
        >
          <RealtimeAreaChart
            data={chart}
            series={[
              { key: "probability", name: "Flood probability %", color: "var(--color-chart-4)" },
              { key: "rainfall", name: "Rainfall mm/hr", color: "var(--color-chart-1)" },
              { key: "soil", name: "Soil moisture %", color: "var(--color-chart-2)" },
            ]}
            height={240}
          />
        </Panel>
        <ResponsibleAiPanel />
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2">
      <span className="data-label">{label}</span>
      <p className="metric mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="panel h-28 animate-pulse" />
      ))}
    </div>
  );
}
