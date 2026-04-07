import { NextResponse } from "next/server";
import { getRooms } from "@/lib/data";
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
      >
    > & { id: string }
  >;
};

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
