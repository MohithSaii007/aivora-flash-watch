import {
  Activity,
  CloudRain,
  Droplets,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Siren,
  WifiOff,
  Waves,
} from "lucide-react";

import { LiveIndicator, Panel } from "./primitives";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SCENARIOS } from "@/lib/aivora/engine";
import { useSimulation } from "@/lib/aivora/store";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 2, 5, 10];

export function SimulationControl({ compact = false }: { compact?: boolean }) {
  const sim = useSimulation();

  return (
    <Panel
      title="Disaster simulation mode"
      subtitle="Drive every dashboard from one place — prototype simulation engine"
      action={
        <LiveIndicator
          label={sim.running ? "SIMULATION RUNNING" : "PAUSED"}
          tone={sim.running ? "primary" : "muted"}
        />
      }
      className="min-w-0"
    >
      <div className="space-y-5">
        <div>
          <span className="data-label">Scenario</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => sim.setScenario(s.id)}
                aria-pressed={sim.scenario === s.id}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  sim.scenario === s.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
                )}
                title={s.description}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {SCENARIOS.find((s) => s.id === sim.scenario)?.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => sim.setRunning(!sim.running)}>
            {sim.running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {sim.running ? "Pause" : "Start scenario"}
          </Button>
          <Button size="sm" variant="secondary" onClick={sim.reset}>
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <Button size="sm" variant="secondary" onClick={sim.normalConditions}>
            <Activity className="size-3.5" /> Normal conditions
          </Button>
          <Button size="sm" variant="destructive" onClick={sim.triggerFlood}>
            <Siren className="size-3.5" /> Trigger flood event
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={sim.bumpRainfall}>
            <CloudRain className="size-3.5" /> Increase rainfall
          </Button>
          <Button size="sm" variant="secondary" onClick={sim.bumpSoil}>
            <Droplets className="size-3.5" /> Increase soil moisture
          </Button>
          <Button size="sm" variant="secondary" onClick={sim.bumpRiver}>
            <Waves className="size-3.5" /> Increase river level
          </Button>
          <Button size="sm" variant="secondary" onClick={sim.triggerSensorFailure}>
            <Gauge className="size-3.5" /> Sensor failure
          </Button>
          <Button size="sm" variant="secondary" onClick={sim.triggerConnectivityLoss}>
            <WifiOff className="size-3.5" /> Network failure
          </Button>
        </div>

        <div>
          <span className="data-label">Simulation speed</span>
          <div className="mt-2 flex gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => sim.setSpeed(s)}
                aria-pressed={sim.speed === s}
                className={cn(
                  "rounded-md border px-3 py-1 font-mono text-xs transition-colors",
                  sim.speed === s
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary hover:border-primary/40",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {!compact && (
          <div className="grid gap-4 sm:grid-cols-2">
            <DriverSlider
              label="Rainfall intensity"
              unit="mm/hr"
              value={sim.drivers.rainfall}
              min={0}
              max={120}
              step={1}
              onChange={(v) => sim.setDrivers({ rainfall: v })}
            />
            <DriverSlider
              label="Soil moisture"
              unit="%"
              value={sim.drivers.soil}
              min={20}
              max={98}
              step={1}
              onChange={(v) => sim.setDrivers({ soil: v })}
            />
            <DriverSlider
              label="River level"
              unit="m"
              value={sim.drivers.river}
              min={1.4}
              max={5.6}
              step={0.1}
              onChange={(v) => sim.setDrivers({ river: v })}
            />
            <DriverSlider
              label="River rise rate"
              unit="m/min"
              value={sim.drivers.riverRise}
              min={0}
              max={0.3}
              step={0.01}
              onChange={(v) => sim.setDrivers({ riverRise: v })}
            />
            <DriverSlider
              label="Sensor health"
              unit="%"
              value={sim.drivers.sensorHealth}
              min={0}
              max={100}
              step={1}
              onChange={(v) => sim.setDrivers({ sensorHealth: v })}
            />
            <DriverSlider
              label="Population vulnerability"
              unit="idx"
              value={sim.drivers.vulnerability}
              min={20}
              max={100}
              step={1}
              onChange={(v) => sim.setDrivers({ vulnerability: v })}
            />
          </div>
        )}
      </div>
    </Panel>
  );
}

function DriverSlider({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="data-label">{label}</span>
        <span className="metric text-sm">
          {value.toFixed(step < 1 ? 2 : 0)}
          <span className="ml-1 font-mono text-[10px] text-muted-foreground">{unit}</span>
        </span>
      </div>
      <Slider
        className="mt-2"
        value={[value]}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
    </div>
  );
}
