import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase";
import { DEFAULT_FLOORPLAN_IMAGE_PATH } from "@/lib/floorplan-defaults";
import { storageObjectPathFromPublicUrl } from "@/lib/public-url";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "room-images";

export const dynamic = "force-dynamic";

/** Remove uploaded base floor plan from storage and reset to bundled default SVG. */
export async function DELETE() {
  try {
    const supabase = createServiceSupabase();
    const { data: fp, error: fpErr } = await supabase
      .from("floorplans")
      .select("id, image_path")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fpErr || !fp?.id) {
      return NextResponse.json(
        { error: "No active floorplan" },
        { status: 400 }
      );
    }

    const objectKey = storageObjectPathFromPublicUrl(
      fp.image_path?.trim() ?? "",
      BUCKET
    );
    if (objectKey?.startsWith("floorplans/")) {
      const { error: rmErr } = await supabase.storage
        .from(BUCKET)
        .remove([objectKey]);
      if (rmErr) console.error("floorplan storage remove:", rmErr);
    }

    const { data: updated, error: updErr } = await supabase
      .from("floorplans")
      .update({
        image_path: DEFAULT_FLOORPLAN_IMAGE_PATH,
        svg_content: null,
      })
      .eq("id", fp.id)
      .select("*")
      .single();

    if (updErr) throw updErr;
    return NextResponse.json({ floorplan: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not reset floor plan base image." },
      { status: 503 }
    );
  }
}
