"use client";

import { useEffect, useMemo } from "react";
import { divIcon } from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

import { nearestPointOnRoute } from "@/lib/geo";
import { Poi, RoutePoint } from "@/lib/types";

interface MapViewProps {
  points: RoutePoint[];
  pois: Poi[];
  activeIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  onPoiSelect: (distKm: number) => void;
}

const categoryStyle = {
  water: { color: "#1d4ed8", label: "Eau" },
  bar: { color: "#b45309", label: "Bar/Cafe" },
  food_shop: { color: "#047857", label: "Commerce alim." }
} as const;

const bikeSyncIcon = divIcon({
  html: "🚴",
  className: "bike-sync-marker",
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

function FitBounds({ points }: { points: RoutePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    const bounds = points.map((point) => [point.lat, point.lon] as [number, number]);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

export function MapView({ points, pois, activeIndex, onHoverIndex, onPoiSelect }: MapViewProps) {
  const linePositions = useMemo(() => points.map((point) => [point.lat, point.lon] as [number, number]), [points]);

  if (points.length === 0) {
    return <div className="map-wrap map-empty">Trace introuvable.</div>;
  }

  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div className="map-wrap" data-testid="map-container">
      <MapContainer
        center={[points[0].lat, points[0].lon]}
        zoom={8}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        className="map-canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <Polyline
          pane="overlayPane"
          positions={linePositions}
          pathOptions={{ color: "#222", weight: 4 }}
          eventHandlers={{
            mousemove(event) {
              const nearest = nearestPointOnRoute(points, {
                lat: event.latlng.lat,
                lon: event.latlng.lng
              });
              onHoverIndex(nearest.index);
            },
            mouseout() {
              onHoverIndex(null);
            }
          }}
        />

        {activePoint ? <Marker pane="markerPane" position={[activePoint.lat, activePoint.lon]} icon={bikeSyncIcon} /> : null}

        {pois.map((poi) => {
          const style = categoryStyle[poi.category];
          return (
            <CircleMarker
              key={poi.id}
              pane="markerPane"
              center={[poi.lat, poi.lon]}
              radius={5}
              pathOptions={{ color: style.color, fillColor: style.color, fillOpacity: 0.85 }}
              eventHandlers={{
                click: (event) => {
                  onPoiSelect(poi.nearestTraceDistKm);
                  const map = event.target?._map;
                  if (map) {
                    map.flyTo([poi.lat, poi.lon], Math.max(map.getZoom(), 12), { duration: 0.6 });
                  }
                }
              }}
            >
              <Popup>
                <strong>{poi.name}</strong>
                <br />
                {style.label}
                <br />
                {poi.distToTraceKm.toFixed(2)} km de la trace
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
