import { nearestPointOnRoute, sampleRoutePointsByDistance } from "@/lib/geo";
import { loadRouteFromGpx } from "@/lib/gpx";
import { Poi, PoiCategory } from "@/lib/types";

interface OverpassElement {
  type: "node" | "way";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];

const REQUEST_TIMEOUT_MS = 35_000;
const MAX_RETRIES_PER_ENDPOINT = 2;
const SAMPLE_STEP_KM = 3;
const BATCH_SIZE = 18;

function categoryFromTags(tags: Record<string, string>): PoiCategory | null {
  if (tags.amenity === "drinking_water" || tags.amenity === "fountain") {
    return "water";
  }

  if (["bar", "pub", "cafe"].includes(tags.amenity ?? "")) {
    return "bar";
  }

  if (["supermarket", "convenience", "bakery", "butcher"].includes(tags.shop ?? "")) {
    return "food_shop";
  }

  return null;
}

export function mapTagsToCategory(tags?: Record<string, string>): PoiCategory | null {
  if (!tags) {
    return null;
  }
  return categoryFromTags(tags);
}

function getElementCoordinates(element: OverpassElement): { lat: number; lon: number } | null {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { lat: element.lat, lon: element.lon };
  }

  if (element.center) {
    return element.center;
  }

  if (element.geometry && element.geometry.length > 0) {
    const sum = element.geometry.reduce(
      (acc, point) => ({ lat: acc.lat + point.lat, lon: acc.lon + point.lon }),
      { lat: 0, lon: 0 }
    );

    return {
      lat: sum.lat / element.geometry.length,
      lon: sum.lon / element.geometry.length
    };
  }

  return null;
}

function buildOverpassQuery(sampledPoints: Array<{ lat: number; lon: number }>, radiusMeters: number): string {
  const areaClauses = sampledPoints
    .map((point) => `node(around:${radiusMeters},${point.lat},${point.lon});way(around:${radiusMeters},${point.lat},${point.lon});`)
    .join("\n");

  return `
[out:json][timeout:45];
(
  ${areaClauses}
)->.all;
(
  node.all["amenity"="drinking_water"];
  node.all["amenity"="fountain"];
  way.all["amenity"="drinking_water"];
  way.all["amenity"="fountain"];
  node.all["amenity"~"^(bar|pub|cafe)$"];
  node.all["shop"~"^(supermarket|convenience|bakery|butcher)$"];

  way.all["amenity"~"^(bar|pub|cafe)$"];
  way.all["shop"~"^(supermarket|convenience|bakery|butcher)$"];
);
out center tags;
  `.trim();
}

function chunkPoints<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOverpass(endpoint: string, query: string): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ data: query }).toString(),
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok && shouldRetryStatus(response.status)) {
      throw new Error(`retryable:${response.status}`);
    }

    if (!response.ok) {
      throw new Error(`Overpass indisponible (${response.status})`);
    }

    const body = (await response.json()) as OverpassResponse;
    return body.elements ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBatchWithFallback(
  sampledPoints: Array<{ lat: number; lon: number }>,
  radiusMeters: number
): Promise<OverpassElement[]> {
  const query = buildOverpassQuery(sampledPoints, radiusMeters);
  const failures: string[] = [];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_ENDPOINT; attempt += 1) {
      try {
        return await fetchOverpass(endpoint, query);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erreur inconnue";
        failures.push(`${endpoint}#${attempt}:${message}`);
        if (!message.startsWith("retryable:")) {
          break;
        }
        await wait(400 * attempt);
      }
    }
  }

  throw new Error(`Overpass indisponible (${failures.slice(-1)[0] ?? "aucun endpoint"})`);
}

export async function getPoisNearRoute(radiusKm: number): Promise<Poi[]> {
  const route = await loadRouteFromGpx();
  const sampled = sampleRoutePointsByDistance(route.points, SAMPLE_STEP_KM).map((point) => ({
    lat: point.lat,
    lon: point.lon
  }));
  const sampledBatches = chunkPoints(sampled, BATCH_SIZE);
  const radiusMeters = Math.round(radiusKm * 1000);

  const allElements: OverpassElement[] = [];
  let successfulBatches = 0;
  for (const batch of sampledBatches) {
    try {
      const batchElements = await fetchBatchWithFallback(batch, radiusMeters);
      allElements.push(...batchElements);
      successfulBatches += 1;
    } catch {
      // Continue with the next batch to provide partial POIs when one request fails.
    }
  }

  if (successfulBatches === 0) {
    throw new Error("Overpass indisponible (tous les endpoints ont echoue)");
  }

  const dedup = new Map<string, Poi>();

  for (const element of allElements) {
    const tags = element.tags ?? {};
    const category = mapTagsToCategory(tags);
    if (!category) {
      continue;
    }

    const coords = getElementCoordinates(element);
    if (!coords) {
      continue;
    }

    const nearest = nearestPointOnRoute(route.points, coords);
    const distToTraceKm = nearest.distanceMeters / 1000;
    if (distToTraceKm > radiusKm) {
      continue;
    }

    const key = `${element.type}/${element.id}`;
    dedup.set(key, {
      id: key,
      category,
      name: tags.name ?? "Sans nom",
      lat: coords.lat,
      lon: coords.lon,
      tags,
      distToTraceKm: Number(distToTraceKm.toFixed(2)),
      nearestTraceDistKm: Number(nearest.distAlongKm.toFixed(2))
    });
  }

  return Array.from(dedup.values()).sort((a, b) => a.nearestTraceDistKm - b.nearestTraceDistKm);
}
