import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "room-images";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const supabase = createServiceSupabase();
    const { data: row, error: selErr } = await supabase
      .from("room_images")
      .select("id, storage_path")
      .eq("id", id)
      .maybeSingle();

    if (selErr) throw selErr;
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error: rmErr } = await supabase.storage
      .from(BUCKET)
      .remove([row.storage_path]);
    if (rmErr) console.error("storage remove:", rmErr);

    const { error: delErr } = await supabase
      .from("room_images")
      .delete()
      .eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Delete failed" }, { status: 503 });
  }
}
