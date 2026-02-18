import { GET, getPoisPayload } from "@/app/api/pois/route";
import type { Poi } from "@/lib/types";
import { getPoisNearRoute } from "@/lib/overpass";

vi.mock("@/lib/overpass", () => ({
  getPoisNearRoute: vi.fn()
}));

const mockedGetPoisNearRoute = vi.mocked(getPoisNearRoute);

describe("GET /api/pois", () => {
  beforeEach(() => {
    mockedGetPoisNearRoute.mockReset();
  });

  it("returns categories and deduced payload structure", async () => {
    const sample: Poi[] = [
      {
        id: "node/1",
        category: "water",
        name: "Fontaine",
        lat: 48,
        lon: 2,
        tags: { amenity: "drinking_water" },
        distToTraceKm: 0.3,
        nearestTraceDistKm: 12.2
      }
    ];

    mockedGetPoisNearRoute.mockResolvedValue(sample);
    const payload = await getPoisPayload(5);

    expect(payload.meta.radiusKm).toBe(5);
    expect(payload.pois).toHaveLength(1);
    expect(payload.pois[0].category).toBe("water");
  });

  it("returns HTTP 503 on overpass failure", async () => {
    mockedGetPoisNearRoute.mockRejectedValue(new Error("overpass down"));
    const response = await GET(new Request("http://localhost/api/pois?radiusKm=5"));

    expect(response.status).toBe(503);
    const json = (await response.json()) as { error?: string };
    expect(json.error).toContain("overpass down");
  });

  it("clamps radius to max 10 km", async () => {
    mockedGetPoisNearRoute.mockResolvedValue([]);
    await GET(new Request("http://localhost/api/pois?radiusKm=20"));

    expect(mockedGetPoisNearRoute).toHaveBeenCalledWith(10);
  });
});
