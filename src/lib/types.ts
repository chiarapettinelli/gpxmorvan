export type PoiCategory = "water" | "bar" | "food_shop";

export interface RoutePoint {
  lat: number;
  lon: number;
  ele: number;
  distKm: number;
}

export interface RouteStats {
  distanceKm: number;
  gainM: number;
  lossM: number;
  minEle: number;
  maxEle: number;
}

export interface RoutePayload {
  routeName: string;
  points: RoutePoint[];
  stats: RouteStats;
}

export interface Poi {
  id: string;
  category: PoiCategory;
  name: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  distToTraceKm: number;
  nearestTraceDistKm: number;
}

export interface PoisPayload {
  pois: Poi[];
  meta: {
    radiusKm: number;
    source: "overpass";
    fetchedAt: string;
  };
  error?: string;
}
