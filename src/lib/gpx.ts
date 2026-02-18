import { XMLParser } from "fast-xml-parser";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { haversineDistanceMeters } from "@/lib/geo";
import { RoutePayload, RoutePoint } from "@/lib/types";

const GPX_FILE = "J1 - Fontainebleau - Chissey-en-Morvan.gpx";
const GPX_PATH = path.join(process.cwd(), "public", "gpx", GPX_FILE);

let routeCache: RoutePayload | null = null;

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function normalizeTrackPoints(raw: unknown): Array<{ lat: number; lon: number; ele: number }> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ""
  });
  const parsed = parser.parse(raw as string) as {
    gpx?: {
      trk?: {
        name?: string;
        trkseg?: {
          trkpt?: Array<{ lat: string; lon: string; ele?: string }>;
        } | Array<{ trkpt?: Array<{ lat: string; lon: string; ele?: string }> }>;
      } | Array<{
        name?: string;
        trkseg?: {
          trkpt?: Array<{ lat: string; lon: string; ele?: string }>;
        } | Array<{ trkpt?: Array<{ lat: string; lon: string; ele?: string }> }>;
      }>;
      metadata?: {
        name?: string;
      };
    };
  };

  const tracks = asArray(parsed.gpx?.trk);
  const firstTrack = tracks[0];
  if (!firstTrack) {
    return [];
  }

  const segments = asArray(firstTrack.trkseg);
  const output: Array<{ lat: number; lon: number; ele: number }> = [];

  for (const segment of segments) {
    const pts = asArray(segment.trkpt);
    for (const point of pts) {
      const lat = Number(point.lat);
      const lon = Number(point.lon);
      const ele = Number(point.ele ?? 0);
      if (Number.isFinite(lat) && Number.isFinite(lon) && Number.isFinite(ele)) {
        output.push({ lat, lon, ele });
      }
    }
  }

  return output;
}

function buildRoutePayload(points: Array<{ lat: number; lon: number; ele: number }>): RoutePayload {
  let cumulativeMeters = 0;
  let gainM = 0;
  let lossM = 0;
  let minEle = Number.POSITIVE_INFINITY;
  let maxEle = Number.NEGATIVE_INFINITY;

  const routePoints: RoutePoint[] = points.map((point, index) => {
    if (index > 0) {
      const prev = points[index - 1];
      cumulativeMeters += haversineDistanceMeters(prev.lat, prev.lon, point.lat, point.lon);
      const deltaEle = point.ele - prev.ele;
      if (deltaEle > 0) {
        gainM += deltaEle;
      } else {
        lossM += -deltaEle;
      }
    }

    minEle = Math.min(minEle, point.ele);
    maxEle = Math.max(maxEle, point.ele);

    return {
      lat: point.lat,
      lon: point.lon,
      ele: point.ele,
      distKm: Number((cumulativeMeters / 1000).toFixed(3))
    };
  });

  return {
    routeName: "J1 - Fontainebleau - Chissey-en-Morvan",
    points: routePoints,
    stats: {
      distanceKm: Number((cumulativeMeters / 1000).toFixed(1)),
      gainM: Math.round(gainM),
      lossM: Math.round(lossM),
      minEle: Number(minEle.toFixed(1)),
      maxEle: Number(maxEle.toFixed(1))
    }
  };
}

export async function loadRouteFromGpx(): Promise<RoutePayload> {
  if (routeCache) {
    return routeCache;
  }

  const xml = await readFile(GPX_PATH, "utf8");
  const points = normalizeTrackPoints(xml);
  if (points.length === 0) {
    throw new Error("Aucun point trace trouve dans le GPX.");
  }

  routeCache = buildRoutePayload(points);
  return routeCache;
}

export function resetRouteCache(): void {
  routeCache = null;
}
