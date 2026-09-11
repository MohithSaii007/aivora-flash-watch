/**
 * AIVORA service layer.
 *
 * Every read/write goes through these functions so a real external API
 * (FastAPI ML service, MQTT/IoT gateway, PostGIS geospatial service, state
 * disaster-management feeds) can replace the implementation without touching UI
 * code. Endpoint names mirror the documented REST surface.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  AlertRecord,
  EmergencyActionRecord,
  EvacuationRouteRecord,
  HistoricalEventRecord,
  LocationRecord,
  RoadRecord,
  SensorRecord,
  ShelterRecord,
  VulnerabilityRecord,
} from "@/lib/aivora/types";

/** GET /locations */
export async function getLocations(): Promise<LocationRecord[]> {
  const { data, error } = await supabase.from("locations").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as LocationRecord[];
}

/** GET /sensors */
export async function getSensors(): Promise<SensorRecord[]> {
  const { data, error } = await supabase.from("sensors").select("*").order("sensor_id");
  if (error) throw error;
  return (data ?? []) as SensorRecord[];
}

/** GET /sensor-readings */
export async function getSensorReadings(sensorId: string, limit = 40) {
  const { data, error } = await supabase
    .from("sensor_readings")
    .select("*")
    .eq("sensor_id", sensorId)
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** GET /rainfall */
export async function getRainfall(locationId?: string) {
  let q = supabase.from("rainfall").select("*").order("timestamp", { ascending: false }).limit(200);
  if (locationId) q = q.eq("location_id", locationId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** GET /vulnerabilities */
export async function getVulnerabilities(): Promise<VulnerabilityRecord[]> {
  const { data, error } = await supabase.from("vulnerabilities").select("*");
  if (error) throw error;
  return (data ?? []) as VulnerabilityRecord[];
}

/** GET /shelters */
export async function getShelters(): Promise<ShelterRecord[]> {
  const { data, error } = await supabase.from("shelters").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as ShelterRecord[];
}

/** GET /roads */
export async function getRoads(): Promise<RoadRecord[]> {
  const { data, error } = await supabase.from("roads").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as RoadRecord[];
}

/** GET /evacuation-routes */
export async function getEvacuationRoutes(): Promise<EvacuationRouteRecord[]> {
  const { data, error } = await supabase.from("evacuation_routes").select("*");
  if (error) throw error;
  return (data ?? []) as EvacuationRouteRecord[];
}

/** GET /historical-events */
export async function getHistoricalEvents(): Promise<HistoricalEventRecord[]> {
  const { data, error } = await supabase
    .from("historical_events")
    .select("*")
    .order("event_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HistoricalEventRecord[];
}

/** GET /alerts */
export async function getAlerts(): Promise<AlertRecord[]> {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw error;
  return (data ?? []) as AlertRecord[];
}

/** POST /alerts/create */
export async function createAlert(input: {
  location_id: string;
  alert_type: string;
  risk_level: AlertRecord["risk_level"];
  probability: number;
  lead_time: number | null;
  message: string;
  recommended_action: string;
}) {
  const { data, error } = await supabase.from("alerts").insert(input).select().single();
  if (error) throw error;
  return data as AlertRecord;
}

export async function updateAlertStatus(id: string, status: string) {
  const { error } = await supabase
    .from("alerts")
    .update({
      status,
      ...(status === "ACKNOWLEDGED" ? { acknowledged_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);
  if (error) throw error;
}

/** GET /predictions */
export async function getPredictions(locationId?: string) {
  let q = supabase
    .from("predictions")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(200);
  if (locationId) q = q.eq("location_id", locationId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** POST /prediction/run — persists a prototype prediction snapshot. */
export async function savePrediction(input: {
  location_id: string;
  flood_probability: number;
  risk_level: AlertRecord["risk_level"];
  severity: string;
  lead_time_minutes: number | null;
  confidence: number;
  uncertainty: number;
  model_version: string;
}) {
  const { error } = await supabase.from("predictions").insert(input);
  if (error) throw error;
}

/** POST /sensor/update */
export async function pushSensorReading(input: {
  sensor_id: string;
  value: number;
  unit: string;
  quality: string;
}) {
  const { error } = await supabase.from("sensor_readings").insert(input);
  if (error) throw error;
}

/** GET /emergency-actions */
export async function getEmergencyActions(): Promise<EmergencyActionRecord[]> {
  const { data, error } = await supabase
    .from("emergency_actions")
    .select("*")
    .order("priority");
  if (error) throw error;
  return (data ?? []) as EmergencyActionRecord[];
}

export async function updateEmergencyActionStatus(id: string, status: string) {
  const { error } = await supabase.from("emergency_actions").update({ status }).eq("id", id);
  if (error) throw error;
}

/**
 * Future-ready integration stubs. These deliberately throw so the UI never
 * pretends an external system is connected.
 */
export const futureIntegrations = {
  weatherApi: { name: "IMD / Open-Meteo forecast API", connected: false },
  satellite: { name: "Satellite & remote sensing (Sentinel/ISRO)", connected: false },
  mqttGateway: { name: "MQTT broker for ESP32 field nodes", connected: false },
  mlService: { name: "Python FastAPI + XGBoost + SHAP service", connected: false },
  postgis: { name: "PostGIS / GeoPandas geospatial service", connected: false },
  smsGateway: { name: "SMS / WhatsApp / voice alert gateway", connected: false },
  govSystems: { name: "State disaster management integration", connected: false },
};

// ---------------------------------------------------------------------------
// Evacuation orders (public broadcast surface)
// ---------------------------------------------------------------------------

export interface PublicEvacuationOrder {
  id: string;
  location_id: string | null;
  location_name: string;
  risk_level: string;
  risk_score: number;
  probability: number;
  lead_time_minutes: number | null;
  exposed_population: number;
  total_population: number;
  primary_shelter_name: string | null;
  primary_shelter_distance_km: number | null;
  primary_shelter_walk_minutes: number | null;
  primary_shelter_drive_minutes: number | null;
  primary_shelter_accessibility: string | null;
  primary_shelter_available: number | null;
  primary_shelter_lat: number | null;
  primary_shelter_lng: number | null;
  alternate_shelters: {
    name: string;
    distanceKm: number;
    walkMinutes: number;
    availableCapacity: number;
  }[];
  message: string;
  status: string;
  created_at: string;
}

/** GET /evacuation-orders — readable without sign-in so villagers can open it. */
export async function getPublicEvacuationOrders(): Promise<PublicEvacuationOrder[]> {
  const { data, error } = await supabase
    .from("evacuation_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as PublicEvacuationOrder[];
}

/** POST /evacuation-orders */
export async function publishEvacuationOrders(
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from("evacuation_orders").insert(rows as never);
  if (error) throw error;
}

/** PATCH /evacuation-orders/:id */
export async function publishOrderStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("evacuation_orders")
    .update({ status } as never)
    .eq("id", id);
  if (error) throw error;
}

/** DELETE /evacuation-orders */
export async function clearPublishedOrders(): Promise<void> {
  const { error } = await supabase
    .from("evacuation_orders")
    .delete()
    .neq("status", "__none__");
  if (error) throw error;
}
