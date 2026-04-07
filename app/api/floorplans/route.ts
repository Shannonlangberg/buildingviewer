import { NextResponse } from "next/server";
import { getActiveFloorplan } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const floorplan = await getActiveFloorplan();
    return NextResponse.json(
      { floorplan },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load floorplan" },
      { status: 500 }
    );
  }
}
