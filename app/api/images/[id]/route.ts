import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "room-images";

const CAPTION_MAX = 2000;

export const dynamic = "force-dynamic";

type PatchBody = {
  caption?: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    let body: PatchBody;
    try {
      body = (await request.json()) as PatchBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!("caption" in body)) {
      return NextResponse.json(
        { error: "caption is required (string or null)" },
        { status: 400 }
      );
    }

    const raw = body.caption;
    let caption: string | null;
    if (raw === null || raw === undefined) {
      caption = null;
    } else if (typeof raw === "string") {
      const t = raw.trim();
      if (t.length > CAPTION_MAX) {
        return NextResponse.json(
          { error: `Caption must be at most ${CAPTION_MAX} characters` },
          { status: 400 }
        );
      }
      caption = t.length ? t : null;
    } else {
      return NextResponse.json(
        { error: "caption must be a string or null" },
        { status: 400 }
      );
    }

    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from("room_images")
      .update({ caption })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ image: data });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 503 });
  }
}

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
