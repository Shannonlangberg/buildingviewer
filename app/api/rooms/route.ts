import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getRooms } from "@/lib/data";
import { buildNewRoomRow } from "@/lib/room-defaults";
import { createServiceSupabase } from "@/lib/supabase";
import type { Room } from "@/lib/types";

export async function GET() {
  try {
    const rooms = await getRooms();
    return NextResponse.json({ rooms });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load rooms" }, { status: 500 });
  }
}

type PatchBody = {
  updates: Array<
    Partial<
      Pick<
        Room,
        | "label_x"
        | "label_y"
        | "rect_x"
        | "rect_y"
        | "rect_width"
        | "rect_height"
        | "polygon_points"
        | "color"
        | "status"
        | "name"
        | "label_text_color"
        | "label_font_size"
      >
    > & { id: string }
  >;
};

type PostBody = {
  shape_type?: "rect" | "polygon";
  name?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = createServiceSupabase();
    const body = (await request.json()) as PostBody;
    const shape_type = body.shape_type === "polygon" ? "polygon" : "rect";
    const baseName =
      body.name?.trim() ||
      (shape_type === "polygon" ? "New polygon" : "New zone");

    const { data: maxRow } = await supabase
      .from("rooms")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = (maxRow?.sort_order ?? 0) + 1;
    const id = randomUUID();
    const slug = `zone-${id.replace(/-/g, "").slice(0, 12)}`;

    const row = buildNewRoomRow({
      id,
      slug,
      name: baseName,
      shape_type,
      sort_order,
    });

    const { data: inserted, error } = await supabase
      .from("rooms")
      .insert(row)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ room: inserted as Room });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Create failed. Is SUPABASE_SERVICE_ROLE_KEY set?" },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createServiceSupabase();
    const body = (await request.json()) as PatchBody;
    if (!body.updates?.length) {
      return NextResponse.json({ error: "No updates" }, { status: 400 });
    }
    for (const row of body.updates) {
      const { id, ...patch } = row;
      const clean = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined)
      );
      if (Object.keys(clean).length === 0) continue;
      const { error } = await supabase.from("rooms").update(clean).eq("id", id);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Save failed. Is SUPABASE_SERVICE_ROLE_KEY set?" },
      { status: 503 }
    );
  }
}
