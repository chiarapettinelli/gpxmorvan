import { getPoisNearRoute } from "@/lib/overpass";
import { PoisPayload } from "@/lib/types";

export async function getPoisPayload(radiusKm: number): Promise<PoisPayload> {
  const pois = await getPoisNearRoute(radiusKm);
  return {
    pois,
    meta: {
      radiusKm,
      source: "overpass",
      fetchedAt: new Date().toISOString()
    }
  };
}
