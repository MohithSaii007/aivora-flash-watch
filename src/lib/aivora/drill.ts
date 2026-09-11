/**
 * Drill mode — a self-contained test flood centred on the device's own position.
 *
 * Nothing here touches the backend: the order and the safe places are built in
 * the browser from the device coordinates so a presenter can show the siren,
 * the danger banner and the walking routes anywhere in the world. Every label
 * says DRILL so a drill can never be mistaken for a real order.
 */
import type { LocationRecord } from "./types";
import type { PublicEvacuationOrder } from "@/services/aivoraApi";

export type Coords = { latitude: number; longitude: number };

/** A device inside this distance of the drill centre is treated as in danger. */
export const DRILL_RADIUS_KM = 0.05; // 50 metres

const KM_PER_DEG = 111.32;

/** Move a point by a distance in km along a compass bearing in degrees. */
function offset(from: Coords, km: number, bearingDeg: number): Coords {
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (km * Math.cos(rad)) / KM_PER_DEG;
  const dLng =
    (km * Math.sin(rad)) / (KM_PER_DEG * Math.cos((from.latitude * Math.PI) / 180) || 1);
  return { latitude: from.latitude + dLat, longitude: from.longitude + dLng };
}

/** Uphill walking in hilly terrain, rounded up to whole minutes. */
const walkMinutes = (km: number) => Math.max(1, Math.round((km / 3.5) * 60));
const driveMinutes = (km: number) => Math.max(1, Math.round((km / 20) * 60));

const SAFE_PLACES = [
  { name: "DRILL · High Ground Assembly Point", km: 0.18, bearing: 35, capacity: 240 },
  { name: "DRILL · Community Hall Shelter", km: 0.45, bearing: 140, capacity: 520 },
  { name: "DRILL · Secondary School Shelter", km: 0.9, bearing: 260, capacity: 860 },
];

export interface DrillScenario {
  order: PublicEvacuationOrder;
  /** Synthetic location so the siren distance check works exactly like a real order. */
  location: LocationRecord;
  /** The three generated safe places, closest first, for the map and the list. */
  safePlaces: { name: string; coords: Coords; distanceKm: number; walkMinutes: number }[];
}

/** Build a fake but complete CRITICAL evacuation order around the device. */
export function buildDrillScenario(coords: Coords): DrillScenario {
  const id = `drill-${Date.now()}`;
  const safePlaces = SAFE_PLACES.map((s) => ({
    name: s.name,
    coords: offset(coords, s.km, s.bearing),
    distanceKm: s.km,
    walkMinutes: walkMinutes(s.km),
    availableCapacity: s.capacity,
  }));
  const primary = safePlaces[0]!;

  const location: LocationRecord = {
    id,
    name: "DRILL · Your current location",
    district: "Devraan",
    state: "Himvat",
    latitude: coords.latitude,
    longitude: coords.longitude,
    elevation: 640,
    population: 1200,
    vulnerability_score: 78,
  };

  const order: PublicEvacuationOrder = {
    id,
    location_id: id,
    location_name: "DRILL · Your current location",
    risk_level: "CRITICAL",
    risk_score: 91,
    probability: 94,
    lead_time_minutes: 22,
    exposed_population: 744,
    total_population: 1200,
    primary_shelter_name: primary.name,
    primary_shelter_distance_km: primary.distanceKm,
    primary_shelter_walk_minutes: primary.walkMinutes,
    primary_shelter_drive_minutes: driveMinutes(primary.distanceKm),
    primary_shelter_accessibility: "ROAD ACCESSIBLE",
    primary_shelter_available: primary.availableCapacity,
    primary_shelter_lat: primary.coords.latitude,
    primary_shelter_lng: primary.coords.longitude,
    alternate_shelters: safePlaces.slice(1).map((s) => ({
      name: s.name,
      distanceKm: s.distanceKm,
      walkMinutes: s.walkMinutes,
      availableCapacity: s.availableCapacity,
    })),
    message:
      "THIS IS A DRILL — NOT A REAL EMERGENCY. Test flash flood detected within 50 metres of your position. " +
      "In a real event everyone inside this circle would move immediately to the nearest marked safe place on higher ground, " +
      "away from the stream, and stay there until the control room stands the order down.",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
  };

  return { order, location, safePlaces };
}
