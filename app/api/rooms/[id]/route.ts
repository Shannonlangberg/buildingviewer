import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase";

type Ctx = { params: { id: string } };

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const id = context.params.id;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const supabase = createServiceSupabase();
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Delete failed. Is SUPABASE_SERVICE_ROLE_KEY set?" },
      { status: 503 }
    );
  }
}
