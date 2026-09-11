export type RiskLevel = "NORMAL" | "WATCH" | "WARNING" | "CRITICAL";

export type ScenarioId =
  | "normal"
  | "heavy_rain"
  | "saturation"
  | "river_rise"
  | "flash_flood"
  | "custom";

export interface LocationRecord {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  elevation: number;
  population: number;
  vulnerability_score: number;
}

export interface VulnerabilityRecord {
  id: string;
  location_id: string;
  population: number;
  houses: number;
  schools: number;
  hospitals: number;
  bridges: number;
  roads: number;
  shelters: number;
  critical_infrastructure: number;
  vulnerability_score: number;
}

export interface SensorRecord {
  id: string;
  sensor_id: string;
  location_id: string | null;
  sensor_type: string;
  latitude: number;
  longitude: number;
  status: string;
  connectivity: string;
  battery: number;
  last_update: string;
}

export interface ShelterRecord {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupied: number;
  available_capacity: number;
  status: string;
  accessibility: string;
}

export interface RoadRecord {
  id: string;
  name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  accessibility: string;
  flood_risk: string;
  landslide_risk: string;
  status: string;
  shelter_connection: string | null;
}

export interface EvacuationRouteRecord {
  id: string;
  origin_location: string | null;
  shelter_id: string | null;
  distance_km: number;
  estimated_time_minutes: number;
  flood_risk: string;
  landslide_risk: string;
  route_safety_score: number;
  status: string;
}

export interface HistoricalEventRecord {
  id: string;
  event_date: string;
  location_id: string | null;
  rainfall: number;
  severity: string;
  flood_occurred: boolean;
  landslide_occurred: boolean;
  affected_area: number;
  affected_population: number;
  infrastructure_damage: string | null;
  historical_water_level: number;
}

export interface AlertRecord {
  id: string;
  location_id: string | null;
  alert_type: string;
  risk_level: RiskLevel;
  probability: number;
  lead_time: number | null;
  message: string;
  recommended_action: string | null;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
}

export interface EmergencyActionRecord {
  id: string;
  location_id: string | null;
  priority: number;
  action: string;
  reason: string | null;
  status: string;
}

/** Live simulated environmental state for one location. */
export interface LiveFeatures {
  rainfallIntensity: number;
  rainfall15m: number;
  rainfall1h: number;
  rainfall3h: number;
  rainfall6h: number;
  rainfall24h: number;
  rainfallChangeRate: number;
  soilMoisture: number;
  soilMoistureChange: number;
  riverLevel: number;
  riverRiseRate: number;
  slope: number;
  drainageDensity: number;
  distanceFromStream: number;
  historicalFrequency: number;
  vulnerability: number;
  elevation: number;
}

export interface Contribution {
  feature: string;
  weight: number;
}

export interface PredictionResult {
  probability: number;
  riskScore: number;
  riskLevel: RiskLevel;
  severity: string;
  leadTimeMinutes: number | null;
  confidence: number;
  uncertainty: number;
  contributions: Contribution[];
  explanation: string;
  modelVersion: string;
}

export interface LocationLiveState {
  location: LocationRecord;
  features: LiveFeatures;
  prediction: PredictionResult;
  history: Array<{
    t: number;
    probability: number;
    rainfall: number;
    soil: number;
    river: number;
    leadTime: number | null;
  }>;
}

export interface SensorLiveState {
  sensor: SensorRecord;
  value: number;
  unit: string;
  trend: number;
  status: "ONLINE" | "WARNING" | "OFFLINE" | "LOW BATTERY" | "NO DATA";
  connectivity: string;
  battery: number;
  lastUpdate: number;
  quality: string;
}

export type Connectivity = "CONNECTED" | "LIMITED" | "OFFLINE";

export interface RiskThresholds {
  watch: number;
  warning: number;
  critical: number;
}
