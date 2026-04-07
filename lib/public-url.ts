export function publicStorageUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "room-images";
  return `${base}/storage/v1/object/public/${bucket}/${storagePath}`;
}

export function guessMimeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export function isRasterPreview(path: string) {
  const m = guessMimeFromPath(path);
  return m === "image/png" || m === "image/jpeg";
}
