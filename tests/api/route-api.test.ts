import { GET, getRoutePayload } from "@/app/api/route/route";

describe("GET /api/route", () => {
  it("returns route payload and coherent stats", async () => {
    const payload = await getRoutePayload();
    expect(payload.routeName.length).toBeGreaterThan(0);
    expect(payload.points.length).toBeGreaterThan(1000);
    expect(payload.stats.distanceKm).toBeGreaterThan(10);
  });

  it("returns HTTP 200 from route handler", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });
});
