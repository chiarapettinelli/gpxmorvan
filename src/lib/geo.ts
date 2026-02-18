import { RoutePoint } from "@/lib/types";

const EARTH_RADIUS_METERS = 6371000;

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function toProjectedMeters(lat: number, lon: number, refLat: number): { x: number; y: number } {
  const x = toRad(lon) * EARTH_RADIUS_METERS * Math.cos(toRad(refLat));
  const y = toRad(lat) * EARTH_RADIUS_METERS;
  return { x, y };
}

export function haversineDistanceMeters(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): number {
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export function pointSegmentDistanceMeters(
  point: { lat: number; lon: number },
  start: { lat: number; lon: number },
  end: { lat: number; lon: number }
): number {
  const refLat = (point.lat + start.lat + end.lat) / 3;
  const p = toProjectedMeters(point.lat, point.lon, refLat);
  const a = toProjectedMeters(start.lat, start.lon, refLat);
  const b = toProjectedMeters(end.lat, end.lon, refLat);

  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;

  if (ab2 === 0) {
    return Math.hypot(apx, apy);
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;

  return Math.hypot(p.x - cx, p.y - cy);
}

export interface NearestOnRoute {
  index: number;
  distanceMeters: number;
  distAlongKm: number;
}

export function nearestPointOnRoute(
  routePoints: RoutePoint[],
  point: { lat: number; lon: number }
): NearestOnRoute {
  if (routePoints.length === 0) {
    return { index: 0, distanceMeters: Number.POSITIVE_INFINITY, distAlongKm: 0 };
  }

  if (routePoints.length === 1) {
    const only = routePoints[0];
    return {
      index: 0,
      distanceMeters: haversineDistanceMeters(point.lat, point.lon, only.lat, only.lon),
      distAlongKm: only.distKm
    };
  }

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestIndex = 0;

  for (let i = 0; i < routePoints.length - 1; i += 1) {
    const start = routePoints[i];
    const end = routePoints[i + 1];
    const distance = pointSegmentDistanceMeters(point, start, end);
    if (distance < bestDistance) {
      const toStart = haversineDistanceMeters(point.lat, point.lon, start.lat, start.lon);
      const toEnd = haversineDistanceMeters(point.lat, point.lon, end.lat, end.lon);
      bestDistance = distance;
      bestIndex = toStart <= toEnd ? i : i + 1;
    }
  }

  return {
    index: bestIndex,
    distanceMeters: bestDistance,
    distAlongKm: routePoints[bestIndex]?.distKm ?? 0
  };
}

export function sampleRoutePointsByDistance(routePoints: RoutePoint[], stepKm: number): RoutePoint[] {
  if (routePoints.length === 0) {
    return [];
  }

  const sampled: RoutePoint[] = [routePoints[0]];
  let nextThreshold = stepKm;

  for (const point of routePoints) {
    if (point.distKm >= nextThreshold) {
      sampled.push(point);
      nextThreshold += stepKm;
    }
  }

  const last = routePoints[routePoints.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }

  return sampled;
}

export function nearestRouteIndexByDistance(routePoints: RoutePoint[], distKm: number): number {
  if (routePoints.length === 0) {
    return 0;
  }

  let low = 0;
  let high = routePoints.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (routePoints[mid].distKm < distKm) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const current = routePoints[low];
  const previous = routePoints[Math.max(0, low - 1)];

  if (!previous) {
    return low;
  }

  return Math.abs(current.distKm - distKm) < Math.abs(previous.distKm - distKm)
    ? low
    : Math.max(0, low - 1);
}
