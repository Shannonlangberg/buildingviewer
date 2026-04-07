import { NextResponse } from "next/server";
import { createServerAnonSupabase, createServiceSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }
  try {
    const supabase = createServerAnonSupabase();
    if (!supabase) {
      return NextResponse.json({ images: [] });
    }
    const { data, error } = await supabase
      .from("room_images")
      .select("*")
      .eq("room_id", roomId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ images: data ?? [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load images", images: [] },
      { status: 503 }
    );
  }
}

type ReorderBody = {
  items: { id: string; sort_order: number }[];
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as ReorderBody;
    if (!body.items?.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }
    const supabase = createServiceSupabase();
    for (const item of body.items) {
      const { error } = await supabase
        .from("room_images")
        .update({ sort_order: item.sort_order })
        .eq("id", item.id);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Reorder failed" }, { status: 503 });
  }
}
