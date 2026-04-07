export function publicStorageUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "room-images";
  return `${base}/storage/v1/object/public/${bucket}/${storagePath}`;
}

/**
 * Extract storage object key from a Supabase public object URL, or null if not a match.
 */
export function storageObjectPathFromPublicUrl(
  absoluteUrl: string,
  bucket: string
): string | null {
  if (!absoluteUrl || !bucket) return null;
  try {
    const u = new URL(absoluteUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

/** True when active floorplan points at an uploaded file under storage `floorplans/`. */
export function floorplanHasRemovableBaseUpload(
  imagePath: string | null | undefined,
  bucket: string
): boolean {
  const key = storageObjectPathFromPublicUrl(imagePath?.trim() ?? "", bucket);
  return Boolean(key?.startsWith("floorplans/"));
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
