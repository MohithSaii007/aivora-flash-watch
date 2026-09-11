import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Siren } from "lucide-react";

import { Panel, PrototypeNotice, RiskBadge, RiskScoreGauge } from "@/components/aivora/primitives";
import { LocationSelector } from "@/components/aivora/insight";
import { useSimulation } from "@/lib/aivora/store";
import { emergencyPlaybook } from "@/lib/aivora/engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community View — AIVORA" },
      {
        name: "description",
        content:
          "Simple, plain-language flash flood status for residents: what is happening, how much time you have, and what to do now.",
      },
      { property: "og:title", content: "Community View — AIVORA" },
      {
        property: "og:description",
        content: "Plain-language local flood status and safety instructions for villagers and volunteers.",
      },
    ],
  }),
  component: CommunityPage,
});

const PLAIN: Record<string, { headline: string; body: string; tone: string }> = {
  NORMAL: {
    headline: "You are safe right now",
    body: "Rainfall and river levels are normal. Continue with your day and stay aware of weather updates.",
    tone: "border-normal/50 bg-normal/10 text-normal",
  },
  WATCH: {
    headline: "Stay alert",
    body: "Rain is increasing in your area. Keep your phone charged, keep documents ready and avoid the riverbank.",
    tone: "border-watch/50 bg-watch/10 text-watch",
  },
  WARNING: {
    headline: "Prepare to move to higher ground",
    body: "A flash flood is likely in your area. Gather your family and essentials and be ready to move to the nearest shelter.",
    tone: "border-warning/50 bg-warning/10 text-warning",
  },
  CRITICAL: {
    headline: "Move to higher ground now",
    body: "A flash flood is expected very soon. Leave low-lying houses immediately and go to the nearest shelter on a safe route.",
    tone: "border-critical/50 bg-critical/10 text-critical",
  },
};

function CommunityPage() {
  const sim = useSimulation();
  const st = sim.live[sim.selectedLocationId];
  if (!st) return <div className="panel h-64 animate-pulse" />;

  const plain = PLAIN[st.prediction.riskLevel] ?? PLAIN["NORMAL"]!;
  const steps = emergencyPlaybook(st.location.name, st.prediction.riskLevel);
  const shelter = sim.shelters[0];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Your local flood status</h1>
          <p className="text-xs text-muted-foreground">{st.location.name}, {st.location.district}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LocationSelector label="Village" />
          <PrototypeNotice />
        </div>
      </header>

      <section className={cn("rounded-lg border px-5 py-6", plain.tone)}>
        <div className="flex items-start gap-3">
          {st.prediction.riskLevel === "NORMAL" ? (
            <ShieldCheck className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
          ) : (
            <Siren className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
          )}
          <div>
            <h2 className="font-display text-xl font-bold">{plain.headline}</h2>
            <p className="mt-1.5 text-sm opacity-90">{plain.body}</p>
            {st.prediction.leadTimeMinutes !== null && st.prediction.riskLevel !== "NORMAL" && (
              <p className="mt-3 font-mono text-sm">
                Estimated time before water reaches danger level: ~{st.prediction.leadTimeMinutes} minutes
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Current condition">
          <RiskScoreGauge score={st.prediction.riskScore} level={st.prediction.riskLevel} />
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Risk level</span>
            <RiskBadge level={st.prediction.riskLevel} size="md" />
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <li>Rain right now: {st.features.rainfallIntensity.toFixed(0)} mm per hour</li>
            <li>River level: {st.features.riverLevel.toFixed(2)} m (danger at 4.5 m)</li>
            <li>Ground is {st.features.soilMoisture.toFixed(0)}% saturated</li>
          </ul>
        </Panel>

        <Panel title="What to do">
          <ol className="space-y-2 text-xs">
            {steps.map((s, i) => (
              <li key={s.action} className="flex gap-2">
                <span className="metric text-primary">{i + 1}.</span>
                <span>
                  {s.action}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{s.reason}</span>
                </span>
              </li>
            ))}
            {steps.length === 0 && (
              <li className="text-muted-foreground">
                No action needed right now. Keep listening for official updates.
              </li>
            )}
          </ol>
          {shelter && (
            <p className="mt-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
              Nearest shelter: {shelter.name} · {shelter.available_capacity} places free · access {shelter.accessibility}
            </p>
          )}
        </Panel>
      </div>

      <Panel title="Important">
        <p className="text-xs text-muted-foreground">
          This is a prototype built for Smart India Hackathon 2026 and uses simulated data. It is not an official
          warning service. Always follow instructions from your local administration and disaster management authority.
        </p>
      </Panel>
    </div>
  );
}
