import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "room-images";
const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

function extFromMime(mime: string, filename: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/svg+xml") return "svg";
  const m = filename.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "png";
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceSupabase();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Max 20MB" }, { status: 400 });
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: "Use JPG, PNG, WebP, or SVG" },
        { status: 400 }
      );
    }

    const { data: fp, error: fpErr } = await supabase
      .from("floorplans")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fpErr || !fp?.id) {
      return NextResponse.json(
        { error: "No active floorplan row. Run supabase/seed.sql." },
        { status: 400 }
      );
    }

    const ext = extFromMime(mime, file.name);
    const path = `floorplans/${fp.id}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: mime, upsert: false });
    if (upErr) throw upErr;

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
    const publicUrl = `${base}/storage/v1/object/public/${BUCKET}/${path}`;

    const { data: updated, error: updErr } = await supabase
      .from("floorplans")
      .update({
        image_path: publicUrl,
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
      {
        error:
          "Upload failed. Check SUPABASE_SERVICE_ROLE_KEY, bucket, and seed data.",
      },
      { status: 503 }
    );
  }
}
