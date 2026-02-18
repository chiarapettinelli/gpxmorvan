import { loadRouteFromGpx } from "@/lib/gpx";

export async function getRoutePayload() {
  return loadRouteFromGpx();
}
