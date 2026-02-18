import { loadRouteFromGpx, resetRouteCache } from "@/lib/gpx";

describe("gpx parsing", () => {
  beforeEach(() => {
    resetRouteCache();
  });

  it("loads route points with elevation", async () => {
    const route = await loadRouteFromGpx();
    expect(route.points.length).toBeGreaterThan(0);
    expect(route.points[0].ele).toBeTypeOf("number");
  });

  it("produces monotonic cumulative distance", async () => {
    const route = await loadRouteFromGpx();
    for (let i = 1; i < route.points.length; i += 1) {
      expect(route.points[i].distKm).toBeGreaterThanOrEqual(route.points[i - 1].distKm);
    }
  });
});
