import { NextResponse } from "next/server";
import { getActiveFloorplan } from "@/lib/data";

export async function GET() {
  try {
    const floorplan = await getActiveFloorplan();
    return NextResponse.json({ floorplan });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load floorplan" },
      { status: 500 }
    );
  }
}
