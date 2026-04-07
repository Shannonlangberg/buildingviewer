import { NextResponse } from "next/server";
import { guessMimeFromPath } from "@/lib/public-url";
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

/** Browsers often send empty type or application/octet-stream; infer from filename. */
function effectiveFloorplanMime(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  return guessMimeFromPath(file.name);
}

function errorPayload(e: unknown, fallback: string) {
  const msg =
    e && typeof e === "object" && "message" in e
      ? String((e as { message: unknown }).message)
      : typeof e === "string"
        ? e
        : fallback;
  const detail = msg.slice(0, 400);
  return { error: fallback, detail };
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
    const mime = effectiveFloorplanMime(file);
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        {
          error: "Use JPG, PNG, WebP, or SVG",
          detail: `Detected type: ${mime || "unknown"}. If the file is correct, rename it with a proper extension (e.g. .png).`,
        },
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
        {
          error: "No active floorplan row. Run supabase/seed.sql.",
          detail: fpErr?.message,
        },
        { status: 400 }
      );
    }

    const ext = extFromMime(mime, file.name);
    const path = `floorplans/${fp.id}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: mime, upsert: true });
    if (upErr) throw upErr;

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (!base) {
      return NextResponse.json(
        {
          error: "Server misconfiguration",
          detail: "NEXT_PUBLIC_SUPABASE_URL is not set.",
        },
        { status: 500 }
      );
    }
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
    const payload = errorPayload(
      e,
      "Upload failed. Check SUPABASE_SERVICE_ROLE_KEY, bucket name, and seed data."
    );
    return NextResponse.json(payload, { status: 503 });
  }
}
