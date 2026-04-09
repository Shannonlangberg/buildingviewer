import { NextResponse } from "next/server";
import { getActiveFloorplan } from "@/lib/data";
import type { BaseImageTransform } from "@/lib/types";
import { createServiceSupabase } from "@/lib/supabase";

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

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      base_image_transform?: BaseImageTransform;
    };
    const t = body.base_image_transform;
    if (
      !t ||
      typeof t.scale !== "number" ||
      typeof t.offsetX !== "number" ||
      typeof t.offsetY !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid base_image_transform" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabase();
    const { data: fp, error: fpErr } = await supabase
      .from("floorplans")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fpErr || !fp?.id) {
      return NextResponse.json(
        { error: "No active floorplan row" },
        { status: 400 }
      );
    }

    const { data: updated, error: updErr } = await supabase
      .from("floorplans")
      .update({
        base_image_transform: { scale: t.scale, offsetX: t.offsetX, offsetY: t.offsetY },
      })
      .eq("id", fp.id)
      .select("*")
      .single();

    if (updErr) throw updErr;
    return NextResponse.json({ floorplan: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save transform" },
      { status: 500 }
    );
  }
}
