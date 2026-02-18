import { NextResponse } from "next/server";

import { getPoisNearRoute } from "@/lib/overpass";
import { PoisPayload } from "@/lib/types";

function parseRadiusKm(request: Request): number {
  const { searchParams } = new URL(request.url);
  const raw = Number(searchParams.get("radiusKm") ?? "5");
  if (!Number.isFinite(raw)) {
    return 5;
  }
  return Math.min(10, Math.max(1, Number(raw.toFixed(1))));
}

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

export async function GET(request: Request): Promise<Response> {
  const radiusKm = parseRadiusKm(request);

  try {
    const payload = await getPoisPayload(radiusKm);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      {
        pois: [],
        meta: {
          radiusKm,
          source: "overpass",
          fetchedAt: new Date().toISOString()
        },
        error: message
      },
      { status: 503 }
    );
  }
}
