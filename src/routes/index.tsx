import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Cpu,
  Map as MapIcon,
  Radio,
  Route as RouteIcon,
  ShieldCheck,
  Timer,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIVORA — AI Flash Flood Intelligence for Hilly Regions" },
      {
        name: "description",
        content:
          "AIVORA is an AI-driven hyper-local flash flood intelligence system for hilly regions: early prediction, local warnings, lead time and evacuation intelligence.",
      },
      { property: "og:title", content: "AIVORA — AI Flash Flood Intelligence for Hilly Regions" },
      {
        property: "og:description",
        content: "Predict Early. Warn Locally. Act Faster. Save Lives. Smart India Hackathon 2026 prototype (SIH26192).",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: BrainCircuit, title: "Hyper-local prediction", body: "Village-level flood probability instead of district-wide generic forecasts." },
  { icon: Timer, title: "Actionable lead time", body: "Estimated minutes before the river reaches its critical threshold." },
  { icon: MapIcon, title: "Live GIS risk map", body: "Villages, rivers, roads, shelters, sensors and landslide-prone slopes on one map." },
  { icon: Radio, title: "IoT sensor network", body: "Rainfall, river level, soil moisture and weather nodes with health monitoring." },
  { icon: AlertTriangle, title: "Automatic alerting", body: "Threshold crossings raise location-specific alerts with recommended actions." },
  { icon: RouteIcon, title: "Evacuation intelligence", body: "Safest routes and shelter capacity accounting for blocked and risky roads." },
  { icon: Activity, title: "Explainable AI", body: "Every alert shows which factors drove it, with confidence and uncertainty." },
  { icon: Cpu, title: "API-ready architecture", body: "Service layer prepared for real IMD, satellite, MQTT and ML integrations." },
];

const STEPS = [
  ["Sense", "IoT nodes and terrain data feed the district catchments continuously."],
  ["Predict", "The engine builds rainfall, soil, river and terrain features and scores risk 0–100."],
  ["Warn", "Watch, warning and critical thresholds raise hyper-local alerts with lead time."],
  ["Act", "Prioritised emergency actions, safe routes and shelters guide the response."],
];

function Landing() {
  return (
    <main className="grid-backdrop min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-lg font-bold leading-none">AIVORA</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">SIH26192</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-md border border-input px-3.5 py-2 text-xs font-medium transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ demo: true }}
            className="rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Enter control room
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
          <span className="pulse-dot" /> Smart India Hackathon 2026 · software prototype
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight sm:text-6xl">
          AI-driven hyper-local flash flood intelligence for hilly regions
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Predict Early. Warn Locally. Act Faster. Save Lives. AIVORA turns rainfall, soil, river and terrain signals
          into village-level warnings with usable lead time — the minutes that decide whether people reach safety.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/auth"
            search={{ demo: true }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Launch live demo
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md border border-input px-5 py-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            Control-room sign in
          </Link>
        </div>
        <dl className="mt-12 grid gap-3 sm:grid-cols-3">
          {[
            ["Flash floods in hills", "Rise in minutes, not hours — generic forecasts arrive too late."],
            ["Warning granularity", "Village and ward level, not one alert for an entire district."],
            ["Decision support", "Lead time, exposure and safe routes in a single operational view."],
          ].map(([k, v]) => (
            <div key={k} className="panel px-4 py-4">
              <dt className="data-label">{k}</dt>
              <dd className="mt-1.5 text-xs text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-y border-border bg-surface-2/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-2xl font-bold">What AIVORA does</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <article key={f.title} className="panel px-4 py-4">
                <f.icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-2xl font-bold">How it works</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="panel px-4 py-4">
                <span className="metric text-primary">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-6xl space-y-3 px-5">
          <p className="rounded-md border border-watch/40 bg-watch/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-watch">
            Prototype using simulated data — not an official warning service
          </p>
          <p className="text-xs text-muted-foreground">
            AIVORA is a decision-support prototype built for Smart India Hackathon 2026 (problem statement SIH26192).
            Predictions carry uncertainty, lead times are estimates, and all emergency decisions remain with authorised
            disaster-management personnel.
          </p>
        </div>
      </footer>
    </main>
  );
}
