import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Clock,
  Footprints,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Users,
  VolumeX,
} from "lucide-react";

import { getLocations, getPublicEvacuationOrders } from "@/services/aivoraApi";
import type { PublicEvacuationOrder } from "@/services/aivoraApi";
import type { LocationRecord } from "@/lib/aivora/types";
import { haversineKm } from "@/lib/aivora/evacuation";
import { armSiren, playSiren, stopSiren } from "@/lib/aivora/siren";
import { buildDrillScenario, DRILL_RADIUS_KM } from "@/lib/aivora/drill";
import type { DrillScenario } from "@/lib/aivora/drill";
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

/** A phone within this distance of an ordered village is treated as being in the danger zone. */
const DANGER_RADIUS_KM = 8;

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
  // ---- Phone location + automatic siren -------------------------------------
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "asking" | "on" | "denied">("idle");
  const [sirenOn, setSirenOn] = useState(false);
  const sounded = useRef<Set<string>>(new Set());

  useEffect(() => {
    void getLocations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  /** Active orders for villages near this phone, closest first. */
  const nearby = useMemo(() => {
    if (!coords) return [];
    return active
      .map((o) => {
        const loc = locations.find((l) => l.id === o.location_id);
        if (!loc) return null;
        return { order: o, distanceKm: haversineKm(coords, loc) };
      })
      .filter((v): v is { order: PublicEvacuationOrder; distanceKm: number } => v !== null)
      .filter((v) => v.distanceKm <= DANGER_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [active, locations, coords]);

  const inDanger = nearby[0] ?? null;

  const enableAlerts = useCallback(async () => {
    const armed = await armSiren();
    setSirenOn(armed);
    if (!("geolocation" in navigator)) {
      setGeoState("denied");
      return;
    }
    setGeoState("asking");
    navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGeoState("on");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 },
    );
  }, []);

  // Sound the siren once per new order that covers this phone's position.
  useEffect(() => {
    if (!sirenOn || !inDanger) return;
    if (sounded.current.has(inDanger.order.id)) return;
    sounded.current.add(inDanger.order.id);
    playSiren(10);
  }, [sirenOn, inDanger]);

  useEffect(() => stopSiren, []);

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

      {/* Siren + location consent */}
      <section className="mt-4 rounded-lg border border-border bg-card p-4">
        {sirenOn && geoState === "on" ? (
          <div className="flex items-start gap-3">
            <Navigation className="mt-0.5 size-4 shrink-0 text-normal" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">Siren on · watching your location</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {inDanger
                  ? `You are ${inDanger.distanceKm.toFixed(1)} km from ${inDanger.order.location_name}, which is under an evacuation order.`
                  : "You are not inside a village under an evacuation order. Your phone will sound a siren the moment that changes."}
              </p>
              <button
                type="button"
                onClick={() => {
                  stopSiren();
                  setSirenOn(false);
                }}
                className="mt-2 flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground"
              >
                <VolumeX className="size-3.5" aria-hidden="true" />
                Silence siren
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <BellRing className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">Turn on the emergency siren</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Your phone will sound a loud siren and vibrate automatically if you are inside a
                village that is ordered to evacuate. Needs your location and one tap to allow sound.
              </p>
              {geoState === "denied" ? (
                <p className="mt-2 text-[11px] text-warning">
                  Location is blocked, so the siren cannot detect your village. Allow location for
                  this page in your browser settings, or pick your village below.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void enableAlerts()}
                className="mt-2 w-full rounded-md bg-critical px-3 py-2.5 text-xs font-bold text-critical-foreground"
              >
                {geoState === "asking" ? "Waiting for location…" : "Turn on siren for my location"}
              </button>
            </div>
          </div>
        )}
      </section>

      {inDanger ? (
        <section className="mt-4 rounded-lg border-2 border-critical bg-critical/20 p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-critical">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            YOUR LOCATION IS IN DANGER
          </p>
          <h2 className="mt-1 text-lg font-black leading-tight">
            Leave {inDanger.order.location_name} now
          </h2>
          <p className="mt-1 text-xs text-foreground/90">
            You are {inDanger.distanceKm.toFixed(1)} km from this village.
            {inDanger.order.primary_shelter_name
              ? ` Go to ${inDanger.order.primary_shelter_name}, about ${inDanger.order.primary_shelter_walk_minutes} minutes on foot.`
              : " Move to higher ground away from the stream."}
          </p>
          {inDanger.order.primary_shelter_lat && inDanger.order.primary_shelter_lng ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${inDanger.order.primary_shelter_lat},${inDanger.order.primary_shelter_lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-critical px-3 py-2.5 text-xs font-bold text-critical-foreground"
            >
              Take me to the shelter
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </section>
      ) : null}

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
          <section className="mt-5 animate-pulse rounded-lg border border-critical bg-critical/15 p-4">
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
                    <dd className="font-semibold">
                      {Math.min(100, Math.round(o.probability <= 1 ? o.probability * 100 : o.probability))}%
                    </dd>
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
