import type { LocationLiveState, LocationRecord, RiskLevel, ShelterRecord } from "./types";

/** Share of a village's population treated as most exposed at each risk level. */
export const EXPOSURE_SHARE: Record<RiskLevel, number> = {
  NORMAL: 0.08,
  WATCH: 0.2,
  WARNING: 0.38,
  CRITICAL: 0.62,
};

const WALK_KMH = 4; // hilly terrain, mixed ages
const DRIVE_KMH = 24; // narrow hill roads

export interface OrderShelterTarget {
  id: string;
  name: string;
  distanceKm: number;
  walkMinutes: number;
  driveMinutes: number;
  capacity: number;
  availableCapacity: number;
  status: string;
  accessibility: string;
  latitude: number;
  longitude: number;
}

export interface EvacuationOrder {
  id: string;
  locationId: string;
  locationName: string;
  riskLevel: RiskLevel;
  probability: number;
  leadTimeMinutes: number | null;
  totalPopulation: number;
  exposedPopulation: number;
  shelters: OrderShelterTarget[];
  primaryShelterId: string | null;
  issuedAt: number;
  status: "ACTIVE" | "STOOD DOWN";
  message: string;
}

/** Great-circle distance in km. */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Estimated most-exposed head count: low-lying and vulnerable households first. */
export function exposedPopulation(state: LocationLiveState): number {
  const share = EXPOSURE_SHARE[state.prediction.riskLevel];
  const vulnFactor = 0.7 + (state.location.vulnerability_score / 100) * 0.6;
  return Math.min(
    state.location.population,
    Math.round(state.location.population * share * vulnFactor),
  );
}

/** Nearest safe shelters for a village, closest first, unusable shelters last. */
export function nearestShelters(
  location: LocationRecord,
  shelters: ShelterRecord[],
  limit = 3,
): OrderShelterTarget[] {
  return shelters
    .map((s) => {
      const distanceKm = haversineKm(location, s);
      return {
        id: s.id,
        name: s.name,
        distanceKm,
        walkMinutes: Math.max(5, Math.round((distanceKm / WALK_KMH) * 60 * 1.15)),
        driveMinutes: Math.max(2, Math.round((distanceKm / DRIVE_KMH) * 60 * 1.2)),
        capacity: s.capacity,
        availableCapacity: s.available_capacity,
        status: s.status,
        accessibility: s.accessibility,
        latitude: s.latitude,
        longitude: s.longitude,
      };
    })
    .sort((a, b) => {
      const usable = (t: OrderShelterTarget) =>
        t.status !== "OPEN" || t.availableCapacity <= 0 ? 1 : 0;
      return usable(a) - usable(b) || a.distanceKm - b.distanceKm;
    })
    .slice(0, limit);
}

/** Plain-language order text suitable for SMS, siren scripts and public announcement. */
export function orderMessage(
  locationName: string,
  people: number,
  target: OrderShelterTarget | undefined,
  leadTimeMinutes: number | null,
): string {
  const time = leadTimeMinutes && leadTimeMinutes > 0 ? ` You have about ${leadTimeMinutes} minutes.` : "";
  if (!target) {
    return `EVACUATE NOW — ${locationName}. Move immediately to higher ground away from the stream. Approximately ${people} people must move.${time}`;
  }
  return `EVACUATE NOW — ${locationName}. Move immediately to ${target.name}, ${target.distanceKm.toFixed(1)} km away (about ${target.walkMinutes} minutes on foot). Approximately ${people} people must move. Avoid streams, bridges and low-lying roads.${time}`;
}

export function buildEvacuationOrder(
  state: LocationLiveState,
  shelters: ShelterRecord[],
): EvacuationOrder {
  const targets = nearestShelters(state.location, shelters);
  const people = exposedPopulation(state);
  const primary = targets[0];
  return {
    id: `evac-${state.location.id}-${Date.now().toString(36)}`,
    locationId: state.location.id,
    locationName: state.location.name,
    riskLevel: state.prediction.riskLevel,
    probability: state.prediction.probability,
    leadTimeMinutes: state.prediction.leadTimeMinutes,
    totalPopulation: state.location.population,
    exposedPopulation: people,
    shelters: targets,
    primaryShelterId: primary?.id ?? null,
    issuedAt: Date.now(),
    status: "ACTIVE",
    message: orderMessage(state.location.name, people, primary, state.prediction.leadTimeMinutes),
  };
}
