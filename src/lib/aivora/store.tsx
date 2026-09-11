import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  DEFAULT_THRESHOLDS,
  DEMO_SEQUENCE,
  SCENARIOS,
  baselineFeatures,
  emergencyPlaybook,
  runPrediction,
} from "./engine";
import type {
  AlertRecord,
  Connectivity,
  EvacuationRouteRecord,
  LiveFeatures,
  LocationLiveState,
  LocationRecord,
  RiskLevel,
  RiskThresholds,
  RoadRecord,
  ScenarioId,
  SensorLiveState,
  SensorRecord,
  ShelterRecord,
  VulnerabilityRecord,
} from "./types";
import {
  createAlert,
  getEvacuationRoutes,
  getLocations,
  getRoads,
  getSensors,
  getShelters,
  getVulnerabilities,
  savePrediction,
} from "@/services/aivoraApi";

export interface Notification {
  id: string;
  level: RiskLevel;
  title: string;
  body: string;
  ts: number;
  read: boolean;
}

export interface EmergencyActionItem {
  id: string;
  locationId: string;
  locationName: string;
  priority: number;
  action: string;
  reason: string;
  status: string;
}

export interface Drivers {
  rainfall: number;
  soil: number;
  river: number;
  riverRise: number;
  sensorHealth: number;
  vulnerability: number;
}

interface SimulationContextValue {
  ready: boolean;
  loadError: string | null;
  locations: LocationRecord[];
  vulnerabilities: VulnerabilityRecord[];
  shelters: ShelterRecord[];
  roads: RoadRecord[];
  routes: EvacuationRouteRecord[];
  live: Record<string, LocationLiveState>;
  sensors: SensorLiveState[];
  alerts: AlertRecord[];
  actions: EmergencyActionItem[];
  notifications: Notification[];
  running: boolean;
  speed: number;
  scenario: ScenarioId;
  demoRunning: boolean;
  demoStage: number;
  connectivity: Connectivity;
  drivers: Drivers;
  thresholds: RiskThresholds;
  tick: number;
  lastUpdate: number;
  selectedLocationId: string;
  refreshMs: number;
  setSelectedLocationId: (id: string) => void;
  setRunning: (v: boolean) => void;
  setSpeed: (v: number) => void;
  setScenario: (s: ScenarioId) => void;
  setDrivers: (patch: Partial<Drivers>) => void;
  setThresholds: (t: RiskThresholds) => void;
  setConnectivity: (c: Connectivity) => void;
  setRefreshMs: (ms: number) => void;
  reset: () => void;
  startDemo: () => void;
  stopDemo: () => void;
  bumpRainfall: () => void;
  bumpSoil: () => void;
  bumpRiver: () => void;
  triggerFlood: () => void;
  triggerSensorFailure: () => void;
  triggerConnectivityLoss: () => void;
  normalConditions: () => void;
  acknowledgeAlert: (id: string) => void;
  escalateAlert: (id: string) => void;
  setActionStatus: (id: string, status: string) => void;
  markNotificationsRead: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

const HISTORY_LENGTH = 40;
const uid = () => Math.random().toString(36).slice(2, 10);

function scenarioDrivers(id: ScenarioId): Drivers {
  const s = SCENARIOS.find((x) => x.id === id) ?? SCENARIOS[0]!;
  return {
    rainfall: s.rainfall,
    soil: s.soil,
    river: s.river,
    riverRise: s.riverRise,
    sensorHealth: 92,
    vulnerability: 70,
  };
}

/** Per-location modifier: low elevation + high vulnerability escalates faster. */
function locationFactor(loc: LocationRecord) {
  const elevationFactor = 1 + (1400 - Math.min(loc.elevation, 1800)) / 2600;
  const vulnFactor = 0.85 + loc.vulnerability_score / 260;
  return Math.max(0.62, Math.min(1.35, elevationFactor * vulnFactor));
}

function sensorUnit(type: string) {
  switch (type) {
    case "Rain Gauge":
      return "mm/hr";
    case "Soil Moisture":
      return "%";
    case "Water Level":
      return "m";
    case "Temperature/Humidity":
      return "degC";
    default:
      return "idx";
  }
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityRecord[]>([]);
  const [shelters, setShelters] = useState<ShelterRecord[]>([]);
  const [roads, setRoads] = useState<RoadRecord[]>([]);
  const [routes, setRoutes] = useState<EvacuationRouteRecord[]>([]);

  const [live, setLive] = useState<Record<string, LocationLiveState>>({});
  const [sensors, setSensors] = useState<SensorLiveState[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [actions, setActions] = useState<EmergencyActionItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [scenario, setScenarioState] = useState<ScenarioId>("normal");
  const [drivers, setDriversState] = useState<Drivers>(() => scenarioDrivers("normal"));
  const [thresholds, setThresholds] = useState<RiskThresholds>(DEFAULT_THRESHOLDS);
  const [connectivity, setConnectivity] = useState<Connectivity>("CONNECTED");
  const [tick, setTick] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(() => Date.now());
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [refreshMs, setRefreshMs] = useState(2000);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStage, setDemoStage] = useState(0);

  const alertedRef = useRef<Record<string, RiskLevel>>({});
  const persistRef = useRef(0);

  // ---------- initial load ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [locs, vulns, shl, rds, rts, sens] = await Promise.all([
          getLocations(),
          getVulnerabilities(),
          getShelters(),
          getRoads(),
          getEvacuationRoutes(),
          getSensors(),
        ]);
        if (cancelled) return;
        setLocations(locs);
        setVulnerabilities(vulns);
        setShelters(shl);
        setRoads(rds);
        setRoutes(rts);
        setSelectedLocationId((prev) => prev || locs[0]?.id || "");

        const initialLive: Record<string, LocationLiveState> = {};
        for (const loc of locs) {
          const features = baselineFeatures(loc);
          const prediction = runPrediction(features, DEFAULT_THRESHOLDS);
          initialLive[loc.id] = {
            location: loc,
            features,
            prediction,
            history: [
              {
                t: Date.now(),
                probability: prediction.probability,
                rainfall: features.rainfallIntensity,
                soil: features.soilMoisture,
                river: features.riverLevel,
                leadTime: prediction.leadTimeMinutes,
              },
            ],
          };
        }
        setLive(initialLive);
        setSensors(
          sens.map((s: SensorRecord) => ({
            sensor: s,
            value: seedSensorValue(s.sensor_type),
            unit: sensorUnit(s.sensor_type),
            trend: 0,
            status: (s.status === "OFFLINE"
              ? "OFFLINE"
              : s.battery < 20
                ? "LOW BATTERY"
                : s.status === "WARNING"
                  ? "WARNING"
                  : "ONLINE") as SensorLiveState["status"],
            connectivity: s.connectivity,
            battery: s.battery,
            lastUpdate: Date.now(),
            quality: s.status === "OFFLINE" ? "STALE" : "GOOD",
          })),
        );
        setReady(true);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Unable to load prototype dataset");
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pushNotification = useCallback((n: Omit<Notification, "id" | "ts" | "read">) => {
    setNotifications((prev) => [{ ...n, id: uid(), ts: Date.now(), read: false }, ...prev].slice(0, 60));
  }, []);

  // ---------- simulation loop ----------
  useEffect(() => {
    if (!ready || !running) return;
    const interval = Math.max(400, refreshMs / speed);
    const handle = window.setInterval(() => {
      const simMinutes = 1 * speed;
      setLive((prev) => {
        const next: Record<string, LocationLiveState> = {};
        for (const [id, state] of Object.entries(prev)) {
          const f = state.features;
          const factor = locationFactor(state.location);
          const targetRain = drivers.rainfall * factor;
          const targetSoil = Math.min(98, drivers.soil * (0.9 + factor * 0.12));
          const rainfallIntensity = approach(f.rainfallIntensity, targetRain, 0.16 * speed);
          const soilPrev = f.soilMoisture;
          const soilMoisture = approach(soilPrev, targetSoil, 0.09 * speed);
          const riverRiseRate = approach(f.riverRiseRate, drivers.riverRise * factor, 0.22 * speed);
          const riverLevel = Math.min(
            6.2,
            Math.max(
              1.4,
              f.riverLevel + riverRiseRate * simMinutes + (drivers.river - f.riverLevel) * 0.02 * speed,
            ),
          );
          const features: LiveFeatures = {
            ...f,
            rainfallIntensity,
            rainfall15m: rainfallIntensity / 4,
            rainfall1h: rainfallIntensity,
            rainfall3h: f.rainfall3h * 0.94 + rainfallIntensity * 0.22,
            rainfall6h: f.rainfall6h * 0.96 + rainfallIntensity * 0.28,
            rainfall24h: f.rainfall24h * 0.99 + rainfallIntensity * 0.12,
            rainfallChangeRate: (rainfallIntensity - f.rainfallIntensity) / simMinutes,
            soilMoisture,
            soilMoistureChange: (soilMoisture - soilPrev) / simMinutes,
            riverLevel,
            riverRiseRate,
            vulnerability: state.location.vulnerability_score * (drivers.vulnerability / 70),
          };
          const prediction = runPrediction(features, thresholds);
          next[id] = {
            location: state.location,
            features,
            prediction,
            history: [
              ...state.history,
              {
                t: Date.now(),
                probability: prediction.probability,
                rainfall: features.rainfallIntensity,
                soil: features.soilMoisture,
                river: features.riverLevel,
                leadTime: prediction.leadTimeMinutes,
              },
            ].slice(-HISTORY_LENGTH),
          };
        }
        return next;
      });

      setSensors((prev) =>
        prev.map((s) => {
          if (s.status === "OFFLINE") return { ...s, quality: "STALE" };
          const target = sensorTarget(s.sensor.sensor_type, drivers);
          const value = approach(s.value, target, 0.22 * speed) + (Math.random() - 0.5) * 0.4;
          const battery = Math.max(3, s.battery - (Math.random() < 0.08 ? 1 : 0));
          const degraded = drivers.sensorHealth < 45 && Math.random() < 0.04;
          return {
            ...s,
            value,
            trend: value - s.value,
            battery,
            status: degraded
              ? "WARNING"
              : battery < 20
                ? "LOW BATTERY"
                : connectivity === "OFFLINE"
                  ? "NO DATA"
                  : "ONLINE",
            connectivity: connectivity === "OFFLINE" ? "NONE" : s.sensor.connectivity,
            lastUpdate: connectivity === "OFFLINE" ? s.lastUpdate : Date.now(),
            quality: connectivity === "OFFLINE" ? "LAST KNOWN" : "GOOD",
          };
        }),
      );

      setTick((t) => t + 1);
      if (connectivity !== "OFFLINE") setLastUpdate(Date.now());
    }, interval);
    return () => window.clearInterval(handle);
  }, [ready, running, speed, refreshMs, drivers, thresholds, connectivity]);

  // ---------- alert + action engine (reacts to prediction changes) ----------
  useEffect(() => {
    if (!ready) return;
    for (const state of Object.values(live)) {
      const level = state.prediction.riskLevel;
      const previous = alertedRef.current[state.location.id] ?? "NORMAL";
      if (level === previous) continue;
      alertedRef.current[state.location.id] = level;
      if (level !== "WARNING" && level !== "CRITICAL") continue;

      const alertType = level === "CRITICAL" ? "FLASH FLOOD ALERT" : "FLOOD WARNING";
      const message =
        level === "CRITICAL"
          ? `${state.location.name}: critical flash flood risk. Flood probability ${state.prediction.probability}%.`
          : `${state.location.name}: flood warning issued. Flood probability ${state.prediction.probability}%.`;
      const recommended =
        level === "CRITICAL"
          ? "Evacuate vulnerable and low-lying areas along the recommended safe route."
          : "Alert local response team and prepare shelter readiness.";

      const localAlert: AlertRecord = {
        id: uid(),
        location_id: state.location.id,
        alert_type: alertType,
        risk_level: level,
        probability: state.prediction.probability,
        lead_time: state.prediction.leadTimeMinutes,
        message,
        recommended_action: recommended,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        acknowledged_at: null,
      };
      setAlerts((prev) => [localAlert, ...prev]);
      pushNotification({ level, title: alertType, body: message });

      setActions((prev) => {
        const withoutLocation = prev.filter((a) => a.locationId !== state.location.id);
        const generated = emergencyPlaybook(state.location.name, level).map((a) => ({
          id: uid(),
          locationId: state.location.id,
          locationName: state.location.name,
          priority: a.priority,
          action: a.action,
          reason: a.reason,
          status: a.status,
        }));
        return [...withoutLocation, ...generated].sort((a, b) => a.priority - b.priority);
      });

      // Persist to Lovable Cloud (best effort — prototype data).
      void createAlert({
        location_id: state.location.id,
        alert_type: alertType,
        risk_level: level,
        probability: state.prediction.probability,
        lead_time: state.prediction.leadTimeMinutes,
        message,
        recommended_action: recommended,
      }).catch(() => undefined);
    }
  }, [live, ready, pushNotification]);

  // ---------- periodic prediction persistence ----------
  useEffect(() => {
    if (!ready || tick === 0 || tick % 15 !== 0) return;
    const id = selectedLocationId || Object.keys(live)[0];
    const state = id ? live[id] : undefined;
    if (!state || persistRef.current === tick) return;
    persistRef.current = tick;
    void savePrediction({
      location_id: state.location.id,
      flood_probability: state.prediction.probability,
      risk_level: state.prediction.riskLevel,
      severity: state.prediction.severity,
      lead_time_minutes: state.prediction.leadTimeMinutes,
      confidence: state.prediction.confidence,
      uncertainty: state.prediction.uncertainty,
      model_version: state.prediction.modelVersion,
    }).catch(() => undefined);
  }, [tick, ready, live, selectedLocationId]);

  // ---------- guided demo progression ----------
  useEffect(() => {
    if (!demoRunning) return;
    const handle = window.setTimeout(() => {
      const nextStage = demoStage + 1;
      if (nextStage >= DEMO_SEQUENCE.length) {
        setDemoRunning(false);
        pushNotification({
          level: "CRITICAL",
          title: "DEMO COMPLETE",
          body: "Full AIVORA pipeline demonstrated: prediction to evacuation to emergency action.",
        });
        return;
      }
      const stageScenario = DEMO_SEQUENCE[nextStage]!;
      setDemoStage(nextStage);
      setScenarioState(stageScenario);
      setDriversState((d) => ({ ...scenarioDrivers(stageScenario), sensorHealth: d.sensorHealth }));
      const meta = SCENARIOS.find((s) => s.id === stageScenario);
      pushNotification({
        level: nextStage >= 3 ? "CRITICAL" : nextStage >= 2 ? "WARNING" : "WATCH",
        title: `DEMO STAGE ${nextStage + 1} — ${meta?.label ?? stageScenario}`,
        body: meta?.description ?? "",
      });
    }, 14000);
    return () => window.clearTimeout(handle);
  }, [demoRunning, demoStage, pushNotification]);

  // ---------- controls ----------
  const setScenario = useCallback((s: ScenarioId) => {
    setScenarioState(s);
    if (s !== "custom") setDriversState((d) => ({ ...scenarioDrivers(s), sensorHealth: d.sensorHealth }));
  }, []);

  const setDrivers = useCallback((patch: Partial<Drivers>) => {
    setScenarioState("custom");
    setDriversState((d) => ({ ...d, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setScenarioState("normal");
    setDriversState(scenarioDrivers("normal"));
    setConnectivity("CONNECTED");
    setDemoRunning(false);
    setDemoStage(0);
    setAlerts([]);
    setActions([]);
    setNotifications([]);
    alertedRef.current = {};
    setTick(0);
    setLive((prev) => {
      const next: Record<string, LocationLiveState> = {};
      for (const [id, state] of Object.entries(prev)) {
        const features = baselineFeatures(state.location);
        const prediction = runPrediction(features, thresholds);
        next[id] = {
          location: state.location,
          features,
          prediction,
          history: [
            {
              t: Date.now(),
              probability: prediction.probability,
              rainfall: features.rainfallIntensity,
              soil: features.soilMoisture,
              river: features.riverLevel,
              leadTime: prediction.leadTimeMinutes,
            },
          ],
        };
      }
      return next;
    });
    setSensors((prev) =>
      prev.map((s) => ({ ...s, status: "ONLINE", quality: "GOOD", connectivity: "GOOD" })),
    );
    setRunning(true);
    pushNotification({
      level: "NORMAL",
      title: "SIMULATION RESET",
      body: "All locations returned to normal baseline conditions.",
    });
  }, [thresholds, pushNotification]);

  const startDemo = useCallback(() => {
    setRunning(true);
    setSpeed(5);
    setDemoStage(0);
    setScenarioState("normal");
    setDriversState(scenarioDrivers("normal"));
    setDemoRunning(true);
    pushNotification({
      level: "NORMAL",
      title: "DEMO STAGE 1 — Normal",
      body: "Baseline conditions. Watch rainfall, soil, river level and risk escalate automatically.",
    });
  }, [pushNotification]);

  const stopDemo = useCallback(() => setDemoRunning(false), []);

  const bumpRainfall = useCallback(
    () => setDriversState((d) => ({ ...d, rainfall: Math.min(120, d.rainfall + 18) })),
    [],
  );
  const bumpSoil = useCallback(
    () => setDriversState((d) => ({ ...d, soil: Math.min(98, d.soil + 10) })),
    [],
  );
  const bumpRiver = useCallback(
    () =>
      setDriversState((d) => ({
        ...d,
        river: Math.min(5.6, d.river + 0.4),
        riverRise: Math.min(0.28, d.riverRise + 0.05),
      })),
    [],
  );
  const triggerFlood = useCallback(() => {
    setScenarioState("flash_flood");
    setDriversState((d) => ({ ...scenarioDrivers("flash_flood"), sensorHealth: d.sensorHealth }));
    setRunning(true);
  }, []);

  const triggerSensorFailure = useCallback(() => {
    setSensors((prev) => {
      const candidates = prev.filter((s) => s.status !== "OFFLINE");
      const victim = candidates[Math.floor(Math.random() * candidates.length)];
      if (!victim) return prev;
      pushNotification({
        level: "WARNING",
        title: "SENSOR FAILURE",
        body: `${victim.sensor.sensor_type} sensor ${victim.sensor.sensor_id} is offline. Using last known reading.`,
      });
      return prev.map((s) =>
        s.sensor.sensor_id === victim.sensor.sensor_id
          ? { ...s, status: "OFFLINE", connectivity: "NONE", quality: "STALE" }
          : s,
      );
    });
  }, [pushNotification]);

  const triggerConnectivityLoss = useCallback(() => {
    setConnectivity("OFFLINE");
    pushNotification({
      level: "WARNING",
      title: "CONNECTIVITY LOST",
      body: "Operating in offline mode: cached map, last known sensor data, local warnings only.",
    });
    window.setTimeout(() => setConnectivity("LIMITED"), 15000);
    window.setTimeout(() => setConnectivity("CONNECTED"), 30000);
  }, [pushNotification]);

  const normalConditions = useCallback(() => {
    setScenarioState("normal");
    setDriversState(scenarioDrivers("normal"));
    setDemoRunning(false);
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "ACKNOWLEDGED", acknowledged_at: new Date().toISOString() } : a,
      ),
    );
  }, []);

  const escalateAlert = useCallback(
    (id: string) => {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "ESCALATED" } : a)));
      pushNotification({
        level: "CRITICAL",
        title: "ALERT ESCALATED",
        body: "Alert escalated to district emergency operations centre.",
      });
    },
    [pushNotification],
  );

  const setActionStatus = useCallback((id: string, status: string) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const value = useMemo<SimulationContextValue>(
    () => ({
      ready,
      loadError,
      locations,
      vulnerabilities,
      shelters,
      roads,
      routes,
      live,
      sensors,
      alerts,
      actions,
      notifications,
      running,
      speed,
      scenario,
      demoRunning,
      demoStage,
      connectivity,
      drivers,
      thresholds,
      tick,
      lastUpdate,
      selectedLocationId,
      refreshMs,
      setSelectedLocationId,
      setRunning,
      setSpeed,
      setScenario,
      setDrivers,
      setThresholds,
      setConnectivity,
      setRefreshMs,
      reset,
      startDemo,
      stopDemo,
      bumpRainfall,
      bumpSoil,
      bumpRiver,
      triggerFlood,
      triggerSensorFailure,
      triggerConnectivityLoss,
      normalConditions,
      acknowledgeAlert,
      escalateAlert,
      setActionStatus,
      markNotificationsRead,
    }),
    [
      ready,
      loadError,
      locations,
      vulnerabilities,
      shelters,
      roads,
      routes,
      live,
      sensors,
      alerts,
      actions,
      notifications,
      running,
      speed,
      scenario,
      demoRunning,
      demoStage,
      connectivity,
      drivers,
      thresholds,
      tick,
      lastUpdate,
      selectedLocationId,
      refreshMs,
      setScenario,
      setDrivers,
      reset,
      startDemo,
      stopDemo,
      bumpRainfall,
      bumpSoil,
      bumpRiver,
      triggerFlood,
      triggerSensorFailure,
      triggerConnectivityLoss,
      normalConditions,
      acknowledgeAlert,
      escalateAlert,
      setActionStatus,
      markNotificationsRead,
    ],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

function approach(current: number, target: number, rate: number) {
  return current + (target - current) * Math.min(0.9, rate);
}

function seedSensorValue(type: string) {
  switch (type) {
    case "Rain Gauge":
      return 14;
    case "Soil Moisture":
      return 48;
    case "Water Level":
      return 2.5;
    case "Temperature/Humidity":
      return 21;
    default:
      return 15;
  }
}

function sensorTarget(type: string, d: Drivers) {
  switch (type) {
    case "Rain Gauge":
      return d.rainfall;
    case "Soil Moisture":
      return d.soil;
    case "Water Level":
      return d.river;
    case "Temperature/Humidity":
      return 24 - d.rainfall * 0.05;
    default:
      return d.rainfall * 0.6;
  }
}

export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used inside SimulationProvider");
  return ctx;
}

/** Aggregate district-level figures derived from the live per-location states. */
export function useDistrictSummary() {
  const { live, sensors, alerts, thresholds } = useSimulation();
  return useMemo(() => {
    const states = Object.values(live);
    const activeAlerts = alerts.filter((a) => a.status === "ACTIVE").length;
    const avg = (fn: (s: LocationLiveState) => number) =>
      states.length ? states.reduce((a, s) => a + fn(s), 0) / states.length : 0;
    const maxProbability = states.reduce((a, s) => Math.max(a, s.prediction.probability), 0);
    const worst = states.reduce<LocationLiveState | null>(
      (a, s) => (!a || s.prediction.riskScore > a.prediction.riskScore ? s : a),
      null,
    );
    const leadTimes = states
      .map((s) => s.prediction.leadTimeMinutes)
      .filter((v): v is number => v !== null && v > 0);
    return {
      activeAlerts,
      rainfall: avg((s) => s.features.rainfallIntensity),
      soil: avg((s) => s.features.soilMoisture),
      river: avg((s) => s.features.riverLevel),
      maxProbability,
      minLeadTime: leadTimes.length ? Math.min(...leadTimes) : null,
      vulnerableLocations: states.filter((s) => s.prediction.riskScore >= thresholds.watch).length,
      sensorsOnline: sensors.filter((s) => s.status === "ONLINE").length,
      sensorsTotal: sensors.length,
      worst,
      states,
    };
  }, [live, sensors, alerts, thresholds]);
}
