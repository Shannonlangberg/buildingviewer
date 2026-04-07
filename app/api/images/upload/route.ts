import { NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase";
import { ACCEPTED_MIME, MAX_UPLOAD_BYTES } from "@/lib/types";
import { guessMimeFromPath } from "@/lib/public-url";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "room-images";

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function effectiveMime(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  return guessMimeFromPath(file.name);
}

export async function POST(request: Request) {
  try {
    const supabase = createServiceSupabase();
    const form = await request.formData();
    const file = form.get("file");
    const roomId = String(form.get("room_id") ?? "");
    const caption = form.get("caption");
    const uploaderName = form.get("uploader_name");

    if (!(file instanceof File) || !roomId) {
      return NextResponse.json(
        { error: "file and room_id required" },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 20MB limit" },
        { status: 400 }
      );
    }

    const mime = effectiveMime(file);
    if (!ACCEPTED_MIME.includes(mime as (typeof ACCEPTED_MIME)[number])) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const path = `${roomId}/${Date.now()}-${sanitizeName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: mime,
        upsert: false,
      });
    if (upErr) throw upErr;

    const { data: maxRow } = await supabase
      .from("room_images")
      .select("sort_order")
      .eq("room_id", roomId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxRow?.sort_order ?? 0) + 1;

    const { data: inserted, error: insErr } = await supabase
      .from("room_images")
      .insert({
        room_id: roomId,
        storage_path: path,
        caption: caption ? String(caption) : null,
        uploader_name: uploaderName ? String(uploaderName) : null,
        sort_order: nextOrder,
      })
      .select("*")
      .single();

    if (insErr) throw insErr;

    return NextResponse.json({ image: inserted });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "Upload failed. Check bucket, service role key, and storage policies.",
      },
      { status: 503 }
    );
  }
}
