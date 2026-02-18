import { haversineDistanceMeters, nearestPointOnRoute, pointSegmentDistanceMeters } from "@/lib/geo";
import { RoutePoint } from "@/lib/types";

describe("geo utilities", () => {
  it("computes a positive haversine distance", () => {
    const distance = haversineDistanceMeters(48.8566, 2.3522, 48.857, 2.353);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(200);
  });

  it("computes near-zero distance for a point on segment", () => {
    const distance = pointSegmentDistanceMeters(
      { lat: 48, lon: 2 },
      { lat: 48, lon: 1.9999 },
      { lat: 48, lon: 2.0001 }
    );
    expect(distance).toBeLessThan(2);
  });

  it("finds nearest route point", () => {
    const route: RoutePoint[] = [
      { lat: 48, lon: 2, ele: 80, distKm: 0 },
      { lat: 48.001, lon: 2.001, ele: 82, distKm: 0.14 },
      { lat: 48.002, lon: 2.002, ele: 84, distKm: 0.28 }
    ];

    const nearest = nearestPointOnRoute(route, { lat: 48.0012, lon: 2.0012 });
    expect(nearest.index).toBeGreaterThanOrEqual(1);
    expect(nearest.distanceMeters).toBeLessThan(40);
  });
});
