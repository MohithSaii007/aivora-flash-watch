import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { KpiCard, Panel, PrototypeNotice } from "@/components/aivora/primitives";
import { SensorCard } from "@/components/aivora/insight";
import { CategoryBarChart, RealtimeAreaChart } from "@/components/aivora/charts";
import { useSimulation } from "@/lib/aivora/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sensors")({
  head: () => ({
    meta: [
      { title: "IoT Sensor Network — AIVORA" },
      {
        name: "description",
        content:
          "Monitor simulated rainfall, river, soil moisture and weather sensors with battery, connectivity and data-quality status.",
      },
      { property: "og:title", content: "IoT Sensor Network — AIVORA" },
      {
        property: "og:description",
        content: "Field IoT node health, live readings and failure simulation for flash flood monitoring.",
      },
    ],
  }),
  component: SensorsPage,
});

function SensorsPage() {
  const sim = useSimulation();
  const [type, setType] = useState("ALL");
  const types = ["ALL", ...Array.from(new Set(sim.sensors.map((s) => s.sensor.sensor_type)))];
  const list = sim.sensors.filter((s) => type === "ALL" || s.sensor.sensor_type === type);

  const online = sim.sensors.filter((s) => s.status === "ONLINE").length;
  const lowBattery = sim.sensors.filter((s) => s.battery < 25).length;
  const offline = sim.sensors.filter((s) => s.status === "OFFLINE" || s.status === "NO DATA").length;
  const state = sim.live[sim.selectedLocationId];

  const byType = Object.entries(
    sim.sensors.reduce<Record<string, number>>((acc, s) => {
      acc[s.sensor.sensor_type] = (acc[s.sensor.sensor_type] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([label, value]) => ({ label: label.split(" ")[0] ?? label, value }));

  const trend = (state?.history ?? []).map((h, i) => ({
    label: `${i}`,
    rainfall: Math.round(h.rainfall),
    soil: Math.round(h.soil),
    river: Number(h.river.toFixed(2)),
  }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">IoT Sensor Network</h1>
          <p className="text-xs text-muted-foreground">
            Simulated ESP32/LoRa field nodes · MQTT ingestion not connected in this prototype
          </p>
        </div>
        <PrototypeNotice />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sensors online" value={`${online}/${sim.sensors.length}`} live />
        <KpiCard label="Offline / no data" value={offline} level={offline > 0 ? "WARNING" : "NORMAL"} live />
        <KpiCard label="Low battery nodes" value={lowBattery} level={lowBattery > 0 ? "WATCH" : "NORMAL"} />
        <KpiCard label="Network status" value={sim.connectivity} live />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Live sensor streams" subtitle={state?.location.name ?? ""} className="xl:col-span-2">
          <RealtimeAreaChart
            data={trend}
            height={250}
            series={[
              { key: "rainfall", name: "Rainfall mm/hr", color: "var(--color-chart-1)" },
              { key: "soil", name: "Soil moisture %", color: "var(--color-chart-2)" },
              { key: "river", name: "River level m", color: "var(--color-chart-3)" },
            ]}
          />
        </Panel>
        <Panel title="Nodes by sensor type">
          <CategoryBarChart data={byType} height={250} />
        </Panel>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            aria-pressed={type === t}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px]",
              type === t ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {list.map((s) => (
          <SensorCard key={s.sensor.id} s={s} />
        ))}
      </div>
    </div>
  );
}
