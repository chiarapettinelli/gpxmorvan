import { NextResponse } from "next/server";

import { getRoutePayload } from "@/lib/api/route";

export async function GET(): Promise<Response> {
  try {
    const payload = await getRoutePayload();
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
