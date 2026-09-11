import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Footprints,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { getPublicEvacuationOrders } from "@/services/aivoraApi";
import type { PublicEvacuationOrder } from "@/services/aivoraApi";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/alert")({
  head: () => ({
    meta: [
      { title: "AIVORA Public Flood Alert — Where To Go Now" },
      {
        name: "description",
        content:
          "Live flash flood evacuation alerts for Devraan district: which villages must move, the nearest safe shelter, distance and walking time.",
      },
      { property: "og:title", content: "AIVORA Public Flood Alert" },
      {
        property: "og:description",
        content:
          "Check if your village is under an evacuation order and see the nearest safe shelter with walking time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicAlertPage,
});

const SAFETY_STEPS = [
  "Leave now. Do not wait for water to reach your house.",
  "Take ID papers, medicines, drinking water, a torch and a charged phone.",
  "Walk to the shelter on the marked route. Never cross flowing water or a submerged bridge.",
  "Help children, elderly people, pregnant women and anyone who cannot walk alone.",
  "Switch off electricity and gas at the mains before leaving.",
  "Stay at the shelter until the control room says it is safe to return.",
];

function PublicAlertPage() {
  const [orders, setOrders] = useState<PublicEvacuationOrder[] | null>(null);
  const [error, setError] = useState(false);
  const [village, setVillage] = useState<string>("ALL");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = async () => {
    try {
      const rows = await getPublicEvacuationOrders();
      setOrders(rows);
      setError(false);
      setRefreshedAt(new Date());
    } catch {
      setError(true);
      setOrders([]);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    const channel = supabase
      .channel("public-evacuation-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "evacuation_orders" },
        () => void load(),
      )
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  const active = useMemo(
    () => (orders ?? []).filter((o) => o.status === "ACTIVE"),
    [orders],
  );
  const villages = useMemo(
    () => Array.from(new Set(active.map((o) => o.location_name))).sort(),
    [active],
  );
  const shown = village === "ALL" ? active : active.filter((o) => o.location_name === village);
  const people = shown.reduce((n, o) => n + o.exposed_population, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 pb-16 pt-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
            AIVORA · DEVRAAN DISTRICT
          </p>
          <h1 className="truncate text-xl font-black">Public flood alert</h1>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground"
          aria-label="Refresh alerts"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Refresh
        </button>
      </header>

      <p className="mt-1 text-[11px] text-muted-foreground">
        {refreshedAt
          ? `Updated ${refreshedAt.toLocaleTimeString()} · updates automatically`
          : "Loading latest alerts…"}
      </p>

      {orders === null ? (
        <p className="mt-8 text-sm text-muted-foreground">Checking for alerts…</p>
      ) : active.length === 0 ? (
        <section className="mt-6 rounded-lg border border-normal/40 bg-normal/10 p-5 text-center">
          <ShieldCheck className="mx-auto size-8 text-normal" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold">No evacuation order right now</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Conditions are being watched every few seconds. This page will change immediately if an
            order is issued for your village.
          </p>
          {error ? (
            <p className="mt-3 text-[11px] text-warning">
              Could not reach the alert service. Keep this page open — it keeps retrying.
            </p>
          ) : null}
        </section>
      ) : (
        <>
          <section className="mt-5 animate-pulse-slow rounded-lg border border-critical bg-critical/15 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-6 shrink-0 text-critical" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-tight text-critical">
                  EVACUATE IMMEDIATELY
                </h2>
                <p className="mt-1 text-xs text-foreground/90">
                  {shown.length} {shown.length === 1 ? "village" : "villages"} under order ·
                  approximately {people.toLocaleString()} people must move now.
                </p>
              </div>
            </div>
          </section>

          {villages.length > 1 ? (
            <div className="mt-4">
              <label
                htmlFor="village"
                className="text-[11px] font-semibold tracking-wide text-muted-foreground"
              >
                YOUR VILLAGE
              </label>
              <select
                id="village"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <option value="ALL">All villages under order</option>
                {villages.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="mt-4 space-y-4">
            {shown.map((o) => (
              <article key={o.id} className="rounded-lg border border-border bg-card p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <h3 className="truncate text-base font-bold">{o.location_name}</h3>
                  <span className="shrink-0 rounded-full bg-critical/20 px-2 py-0.5 text-[10px] font-bold text-critical">
                    {o.risk_level}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">People to move</dt>
                    <dd className="text-base font-bold">{o.exposed_population.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Village population</dt>
                    <dd className="text-base font-bold">{o.total_population.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="size-3" aria-hidden="true" /> Time available
                    </dt>
                    <dd className="font-semibold">
                      {o.lead_time_minutes ? `${o.lead_time_minutes} min` : "Act now"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Flood chance</dt>
                    <dd className="font-semibold">{Math.round(o.probability * 100)}%</dd>
                  </div>
                </dl>

                {o.primary_shelter_name ? (
                  <div className="mt-4 rounded-md border border-normal/40 bg-normal/10 p-3">
                    <p className="text-[10px] font-bold tracking-widest text-normal">GO TO</p>
                    <p className="mt-0.5 text-sm font-bold">{o.primary_shelter_name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden="true" />
                        {o.primary_shelter_distance_km?.toFixed(1)} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Footprints className="size-3" aria-hidden="true" />
                        {o.primary_shelter_walk_minutes} min walk
                      </span>
                      <span>{o.primary_shelter_drive_minutes} min drive</span>
                      {o.primary_shelter_available !== null ? (
                        <span className="flex items-center gap-1">
                          <Users className="size-3" aria-hidden="true" />
                          {o.primary_shelter_available.toLocaleString()} places free
                        </span>
                      ) : null}
                    </p>
                    {o.primary_shelter_accessibility ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Access: {o.primary_shelter_accessibility}
                      </p>
                    ) : null}
                    {o.primary_shelter_lat && o.primary_shelter_lng ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${o.primary_shelter_lat},${o.primary_shelter_lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-normal/20 px-3 py-2 text-xs font-semibold text-normal"
                      >
                        Open route on map
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {o.alternate_shelters.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold tracking-widest text-muted-foreground">
                      IF FULL, GO TO
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                      {o.alternate_shelters.map((s) => (
                        <li key={s.name} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate text-foreground/90">{s.name}</span>
                          <span className="shrink-0">
                            {s.distanceKm?.toFixed(1)} km · {s.walkMinutes} min walk ·{" "}
                            {s.availableCapacity?.toLocaleString()} free
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="mt-3 rounded-md bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground/90">
                  {o.message}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Issued {new Date(o.created_at).toLocaleString()}
                </p>
              </article>
            ))}
          </div>

          <section className="mt-6 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-bold">What to do</h2>
            <ol className="mt-2 space-y-2 text-xs text-muted-foreground">
              {SAFETY_STEPS.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="font-bold text-foreground">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      <footer className="mt-8 space-y-2 text-[10px] leading-relaxed text-muted-foreground">
        <p>
          Prototype for Smart India Hackathon 2026 (SIH26192). Data is simulated for demonstration;
          district names are fictional. Always follow official instructions from local authorities.
        </p>
        <Link to="/" className="inline-block underline">
          About AIVORA
        </Link>
      </footer>
    </main>
  );
}
