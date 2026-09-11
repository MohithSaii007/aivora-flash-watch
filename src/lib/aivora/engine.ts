import type {
  Contribution,
  LiveFeatures,
  LocationRecord,
  PredictionResult,
  RiskLevel,
  RiskThresholds,
  ScenarioId,
} from "./types";

export const MODEL_VERSION = "aivora-sim-0.9 (prototype)";

export const DEFAULT_THRESHOLDS: RiskThresholds = { watch: 40, warning: 60, critical: 80 };

/** Configurable prototype weights for the composite risk score. */
export const RISK_WEIGHTS = {
  rainfall: 0.3,
  soil: 0.2,
  river: 0.2,
  terrain: 0.15,
  historical: 0.1,
  vulnerability: 0.05,
};

export const CRITICAL_RIVER_LEVEL = 4.5;

export function riskLevelFromScore(score: number, t: RiskThresholds = DEFAULT_THRESHOLDS): RiskLevel {
  if (score >= t.critical) return "CRITICAL";
  if (score >= t.warning) return "WARNING";
  if (score >= t.watch) return "WATCH";
  return "NORMAL";
}

export const RISK_META: Record<
  RiskLevel,
  { label: string; token: string; text: string; bg: string; border: string; dot: string }
> = {
  NORMAL: {
    label: "NORMAL",
    token: "normal",
    text: "text-normal",
    bg: "bg-normal/12",
    border: "border-normal/40",
    dot: "bg-normal",
  },
  WATCH: {
    label: "WATCH",
    token: "watch",
    text: "text-watch",
    bg: "bg-watch/12",
    border: "border-watch/40",
    dot: "bg-watch",
  },
  WARNING: {
    label: "WARNING",
    token: "warning",
    text: "text-warning",
    bg: "bg-warning/12",
    border: "border-warning/40",
    dot: "bg-warning",
  },
  CRITICAL: {
    label: "CRITICAL",
    token: "critical",
    text: "text-critical",
    bg: "bg-critical/15",
    border: "border-critical/50",
    dot: "bg-critical",
  },
};

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

/** Terrain descriptors derived deterministically from a location, standing in for DEM/PostGIS layers. */
export function terrainFor(location: LocationRecord) {
  const seed = location.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    slope: 12 + (seed % 28),
    drainageDensity: 1.1 + ((seed % 17) / 17) * 1.8,
    distanceFromStream: 60 + (seed % 9) * 85,
    historicalFrequency: 1 + (seed % 6),
  };
}

export function baselineFeatures(location: LocationRecord): LiveFeatures {
  const terrain = terrainFor(location);
  return {
    rainfallIntensity: 12 + Math.random() * 6,
    rainfall15m: 3.5,
    rainfall1h: 13,
    rainfall3h: 28,
    rainfall6h: 44,
    rainfall24h: 95,
    rainfallChangeRate: 0.2,
    soilMoisture: 44 + Math.random() * 9,
    soilMoistureChange: 0.1,
    riverLevel: 2.4 + Math.random() * 0.4,
    riverRiseRate: 0.005,
    slope: terrain.slope,
    drainageDensity: terrain.drainageDensity,
    distanceFromStream: terrain.distanceFromStream,
    historicalFrequency: terrain.historicalFrequency,
    vulnerability: location.vulnerability_score,
    elevation: location.elevation,
  };
}

/**
 * Prototype AI prediction engine.
 *
 * Deliberately structured as a pure function of an explicit feature vector so a
 * real Python/FastAPI XGBoost service can replace `runPrediction` without any
 * change to the UI layer (see services/predictionService.ts).
 */
export function runPrediction(
  f: LiveFeatures,
  thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
): PredictionResult {
  const rainfallScore = clamp(
    (f.rainfallIntensity / 90) * 70 + (f.rainfall1h / 70) * 15 + (f.rainfall6h / 160) * 15,
  );
  const soilScore = clamp(((f.soilMoisture - 30) / 60) * 100 + f.soilMoistureChange * 12);
  const riverScore = clamp(
    (f.riverLevel / CRITICAL_RIVER_LEVEL) * 82 + Math.min(f.riverRiseRate * 110, 18),
  );
  const terrainScore = clamp(
    (f.slope / 45) * 55 + (1 - Math.min(f.distanceFromStream, 900) / 900) * 30 + f.drainageDensity * 6,
  );
  const historicalScore = clamp((f.historicalFrequency / 6) * 100);
  const vulnerabilityScore = clamp(f.vulnerability);

  const raw =
    rainfallScore * RISK_WEIGHTS.rainfall +
    soilScore * RISK_WEIGHTS.soil +
    riverScore * RISK_WEIGHTS.river +
    terrainScore * RISK_WEIGHTS.terrain +
    historicalScore * RISK_WEIGHTS.historical +
    vulnerabilityScore * RISK_WEIGHTS.vulnerability;

  const riskScore = Math.round(clamp(raw));

  // Logistic mapping from composite score to flood probability.
  const probability = Math.round(clamp(100 / (1 + Math.exp(-(riskScore - 52) / 11))));
  const riskLevel = riskLevelFromScore(riskScore, thresholds);
  const severity =
    riskScore >= thresholds.critical
      ? "HIGH"
      : riskScore >= thresholds.warning
        ? "MODERATE"
        : riskScore >= thresholds.watch
          ? "LOW-MODERATE"
          : "LOW";

  const leadTimeMinutes = estimateLeadTime(f);

  const contributionsRaw: Contribution[] = [
    { feature: "Rainfall intensity", weight: rainfallScore * RISK_WEIGHTS.rainfall },
    { feature: "Soil saturation", weight: soilScore * RISK_WEIGHTS.soil },
    { feature: "River level", weight: riverScore * RISK_WEIGHTS.river },
    { feature: "Slope & terrain", weight: terrainScore * RISK_WEIGHTS.terrain },
    { feature: "Historical vulnerability", weight: historicalScore * RISK_WEIGHTS.historical },
    { feature: "Population exposure", weight: vulnerabilityScore * RISK_WEIGHTS.vulnerability },
  ];
  const total = contributionsRaw.reduce((a, c) => a + c.weight, 0) || 1;
  const contributions = contributionsRaw
    .map((c) => ({ feature: c.feature, weight: Math.round((c.weight / total) * 100) }))
    .sort((a, b) => b.weight - a.weight);

  const confidence = Math.round(
    clamp(72 + (f.rainfallIntensity > 25 ? 10 : 4) + (f.riverRiseRate > 0.02 ? 9 : 3), 60, 96),
  );
  const uncertainty = Math.round(clamp(14 - (confidence - 72) * 0.5, 4, 14));

  const top = contributions.slice(0, 3).map((c) => c.feature.toLowerCase());
  const explanation =
    riskLevel === "NORMAL"
      ? `Conditions are within normal limits. ${top[0]} remains the largest contributor but stays below alert thresholds.`
      : `${cap(top[0])} combined with ${top[1]} and ${top[2]} is driving the current ${riskLevel.toLowerCase()} risk classification.`;

  return {
    probability,
    riskScore,
    riskLevel,
    severity,
    leadTimeMinutes,
    confidence,
    uncertainty,
    contributions,
    explanation,
    modelVersion: MODEL_VERSION,
  };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Time until the river reaches the critical threshold, at the current rate of rise. */
export function estimateLeadTime(f: LiveFeatures): number | null {
  const remaining = CRITICAL_RIVER_LEVEL - f.riverLevel;
  if (remaining <= 0) return 0;
  if (f.riverRiseRate <= 0.001) return null;
  return Math.max(1, Math.round(remaining / f.riverRiseRate));
}

export interface ScenarioTarget {
  id: ScenarioId;
  label: string;
  description: string;
  rainfall: number;
  soil: number;
  river: number;
  riverRise: number;
}

export const SCENARIOS: ScenarioTarget[] = [
  {
    id: "normal",
    label: "Normal",
    description: "Rainfall 10-20 mm/hr, soil 40-55%, river stable.",
    rainfall: 15,
    soil: 48,
    river: 2.5,
    riverRise: 0.004,
  },
  {
    id: "heavy_rain",
    label: "Heavy Rain",
    description: "Rainfall 40-60 mm/hr, soil 60-70%, river slowly rising.",
    rainfall: 50,
    soil: 65,
    river: 2.9,
    riverRise: 0.03,
  },
  {
    id: "saturation",
    label: "Soil Saturation",
    description: "Rainfall 60-80 mm/hr, soil ~82%, river rising.",
    rainfall: 70,
    soil: 82,
    river: 3.4,
    riverRise: 0.07,
  },
  {
    id: "river_rise",
    label: "River Rise",
    description: "Rapid water level increase with sustained rainfall.",
    rainfall: 76,
    soil: 86,
    river: 3.9,
    riverRise: 0.16,
  },
  {
    id: "flash_flood",
    label: "Flash Flood",
    description: "Critical conditions, emergency response stage.",
    rainfall: 88,
    soil: 92,
    river: 4.2,
    riverRise: 0.19,
  },
  {
    id: "custom",
    label: "Custom",
    description: "Manual control of every driver.",
    rainfall: 30,
    soil: 60,
    river: 3,
    riverRise: 0.02,
  },
];

export const DEMO_SEQUENCE: ScenarioId[] = [
  "normal",
  "heavy_rain",
  "saturation",
  "river_rise",
  "flash_flood",
];

export function emergencyPlaybook(locationName: string, riskLevel: RiskLevel) {
  if (riskLevel !== "CRITICAL" && riskLevel !== "WARNING") return [];
  const base = [
    {
      priority: 1,
      action: `Issue local warning for ${locationName}`,
      reason: "Location-specific flood probability above alert threshold",
      status: "PENDING",
    },
    {
      priority: 2,
      action: "Evacuate vulnerable and low-lying households",
      reason: "High exposure population inside modelled inundation zone",
      status: "URGENT",
    },
    {
      priority: 3,
      action: "Close vulnerable road segment",
      reason: "Flood risk HIGH on riverside link",
      status: "RECOMMENDED",
    },
    {
      priority: 4,
      action: "Deploy emergency response team",
      reason: "Short actionable lead time",
      status: "PENDING",
    },
    {
      priority: 5,
      action: "Open designated shelter and confirm capacity",
      reason: "Shelter activation required before evacuation begins",
      status: "PENDING",
    },
    {
      priority: 6,
      action: "Continuously monitor river level sensors",
      reason: "Rate of rise drives lead-time estimate",
      status: "IN PROGRESS",
    },
    {
      priority: 7,
      action: "Check sensor health and data quality",
      reason: "Degraded sensors reduce prediction confidence",
      status: "IN PROGRESS",
    },
  ];
  return riskLevel === "CRITICAL" ? base : base.slice(0, 4);
}
