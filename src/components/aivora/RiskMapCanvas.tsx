import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";

import { RISK_META } from "@/lib/aivora/engine";
import { useSimulation } from "@/lib/aivora/store";
import { RiskBadge } from "@/components/aivora/primitives";

export interface MapLayers {
  riskZones: boolean;
  villages: boolean;
  rivers: boolean;
  roads: boolean;
  sensors: boolean;
  shelters: boolean;
  evacuation: boolean;
  landslide: boolean;
  infrastructure: boolean;
}

export default function RiskMapCanvas({
  layers,
  height = 520,
  focusId,
  onSelect,
}: {
  layers: MapLayers;
  height?: number;
  focusId?: string;
  onSelect?: (id: string) => void;
}) {
  const { live, sensors, shelters, roads, routes, selectedLocationId, thresholds } = useSimulation();
  const states = Object.values(live);
  const focus = focusId ? live[focusId] : undefined;
  const center: [number, number] = focus
    ? [focus.location.latitude, focus.location.longitude]
    : [30.4302, 78.5155];

  const bestRoute = routes
    .filter((r) => r.origin_location === selectedLocationId && r.status === "OPEN")
    .sort((a, b) => b.route_safety_score - a.route_safety_score)[0];
  const routeShelter = bestRoute ? shelters.find((s) => s.id === bestRoute.shelter_id) : undefined;
  const routeOrigin = selectedLocationId ? live[selectedLocationId] : undefined;

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      style={{ height, width: "100%" }}
      className="rounded-lg"
      key={focusId ?? "map"}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {layers.rivers && (
        <Polyline
          positions={[
            [30.3780, 78.5040],
            [30.3902, 78.5120],
            [30.4028, 78.4900],
            [30.4198, 78.5102],
            [30.4300, 78.5290],
            [30.4405, 78.5390],
            [30.4700, 78.5460],
          ]}
          pathOptions={{ color: "var(--color-info)", weight: 4, opacity: 0.75 }}
        >
          <Tooltip sticky>Devraan main stream (simulated)</Tooltip>
        </Polyline>
      )}

      {layers.landslide &&
        states
          .filter((s) => s.features.slope > 26)
          .map((s) => (
            <CircleMarker
              key={`ls-${s.location.id}`}
              center={[s.location.latitude + 0.004, s.location.longitude + 0.004]}
              radius={16}
              pathOptions={{
                color: "var(--color-watch)",
                fillColor: "var(--color-watch)",
                fillOpacity: 0.12,
                dashArray: "4 4",
              }}
            >
              <Tooltip>Landslide-prone slope · {s.location.name}</Tooltip>
            </CircleMarker>
          ))}

      {layers.roads &&
        roads.map((r) => (
          <Polyline
            key={r.id}
            positions={[
              [r.start_lat, r.start_lng],
              [r.end_lat, r.end_lng],
            ]}
            pathOptions={{
              color:
                r.status === "CLOSED"
                  ? "var(--color-critical)"
                  : r.flood_risk === "HIGH"
                    ? "var(--color-warning)"
                    : "var(--color-muted-foreground)",
              weight: r.flood_risk === "HIGH" ? 4 : 2.5,
              dashArray: r.status === "CLOSED" ? "6 6" : undefined,
            }}
          >
            <Popup>
              <strong>{r.name}</strong>
              <br />
              Status: {r.status} · Access: {r.accessibility}
              <br />
              Flood risk: {r.flood_risk} · Landslide risk: {r.landslide_risk}
            </Popup>
          </Polyline>
        ))}

      {layers.evacuation && bestRoute && routeOrigin && routeShelter && (
        <Polyline
          positions={[
            [routeOrigin.location.latitude, routeOrigin.location.longitude],
            [
              (routeOrigin.location.latitude + routeShelter.latitude) / 2 + 0.006,
              (routeOrigin.location.longitude + routeShelter.longitude) / 2 - 0.004,
            ],
            [routeShelter.latitude, routeShelter.longitude],
          ]}
          pathOptions={{ color: "var(--color-normal)", weight: 5, opacity: 0.9 }}
        >
          <Tooltip sticky>
            Safest route · {bestRoute.distance_km} km · {bestRoute.estimated_time_minutes} min · safety{" "}
            {bestRoute.route_safety_score}/100
          </Tooltip>
        </Polyline>
      )}

      {layers.riskZones &&
        states.map((s) => {
          const meta = RISK_META[s.prediction.riskLevel];
          return (
            <CircleMarker
              key={`zone-${s.location.id}`}
              center={[s.location.latitude, s.location.longitude]}
              radius={14 + (s.prediction.riskScore / 100) * 22}
              pathOptions={{
                color: `var(--color-${meta.token})`,
                fillColor: `var(--color-${meta.token})`,
                fillOpacity: 0.16,
                weight: 1,
              }}
            />
          );
        })}

      {layers.villages &&
        states.map((s) => {
          const meta = RISK_META[s.prediction.riskLevel];
          const shelter = shelters.find((sh) => sh.name.includes(s.location.name.split(" ")[0] ?? ""));
          return (
            <CircleMarker
              key={s.location.id}
              center={[s.location.latitude, s.location.longitude]}
              radius={s.location.id === selectedLocationId ? 10 : 7}
              pathOptions={{
                color: `var(--color-${meta.token})`,
                fillColor: `var(--color-${meta.token})`,
                fillOpacity: 0.95,
                weight: s.location.id === selectedLocationId ? 3 : 1.5,
              }}
              eventHandlers={{ click: () => onSelect?.(s.location.id) }}
            >
              <Popup>
                <div className="space-y-1">
                  <strong className="text-sm">{s.location.name}</strong>
                  <div>
                    <RiskBadge level={s.prediction.riskLevel} />
                  </div>
                  <div>Population: {s.location.population.toLocaleString()}</div>
                  <div>Flood probability: {s.prediction.probability}%</div>
                  <div>Risk score: {s.prediction.riskScore}/100</div>
                  <div>
                    Lead time:{" "}
                    {s.prediction.leadTimeMinutes === null
                      ? "not applicable"
                      : `~${s.prediction.leadTimeMinutes} min (±${s.prediction.uncertainty})`}
                  </div>
                  <div>Rainfall: {s.features.rainfallIntensity.toFixed(1)} mm/hr</div>
                  <div>Soil moisture: {s.features.soilMoisture.toFixed(0)}%</div>
                  <div>River level: {s.features.riverLevel.toFixed(2)} m</div>
                  <div>Vulnerability: {s.location.vulnerability_score}/100</div>
                  <div>Nearest shelter: {shelter?.name ?? routeShelter?.name ?? "Nauli Sports Complex"}</div>
                  <div className="pt-1">
                    Action:{" "}
                    {s.prediction.riskScore >= thresholds.critical
                      ? "Evacuate vulnerable and low-lying areas now."
                      : s.prediction.riskScore >= thresholds.warning
                        ? "Prepare evacuation and alert response team."
                        : s.prediction.riskScore >= thresholds.watch
                          ? "Monitor closely; keep team on standby."
                          : "No action required. Continue monitoring."}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

      {layers.sensors &&
        sensors.map((s) => (
          <CircleMarker
            key={s.sensor.id}
            center={[s.sensor.latitude, s.sensor.longitude]}
            radius={4.5}
            pathOptions={{
              color:
                s.status === "OFFLINE" || s.status === "NO DATA"
                  ? "var(--color-critical)"
                  : s.status === "ONLINE"
                    ? "var(--color-primary)"
                    : "var(--color-watch)",
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <strong>
                {s.sensor.sensor_id} · {s.sensor.sensor_type}
              </strong>
              <br />
              Reading: {s.value.toFixed(1)} {s.unit}
              <br />
              Status: {s.status} · Battery: {s.battery}%
              <br />
              Connectivity: {s.connectivity} · Quality: {s.quality}
            </Popup>
          </CircleMarker>
        ))}

      {layers.shelters &&
        shelters.map((sh) => (
          <CircleMarker
            key={sh.id}
            center={[sh.latitude, sh.longitude]}
            radius={7}
            pathOptions={{
              color: "var(--color-normal)",
              fillColor: "var(--color-normal)",
              fillOpacity: 0.5,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{sh.name}</strong>
              <br />
              Capacity {sh.capacity} · Occupied {sh.occupied} · Available {sh.available_capacity}
              <br />
              Status: {sh.status} · {sh.accessibility}
            </Popup>
          </CircleMarker>
        ))}

      {layers.infrastructure &&
        states.map((s) => (
          <CircleMarker
            key={`infra-${s.location.id}`}
            center={[s.location.latitude - 0.003, s.location.longitude + 0.005]}
            radius={4}
            pathOptions={{ color: "var(--color-info)", fillOpacity: 0.7, weight: 1.5 }}
          >
            <Tooltip>School / health facility · {s.location.name}</Tooltip>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}
