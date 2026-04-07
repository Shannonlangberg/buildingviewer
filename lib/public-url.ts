import { DEFAULT_FLOORPLAN_IMAGE_PATH } from "@/lib/floorplan-defaults";

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

/**
 * Same as matching `/storage/v1/object/public/{anyBucket}/…` — avoids client/server
 * bucket name mismatches (e.g. different NEXT_PUBLIC_STORAGE_BUCKET at build vs runtime).
 */
export function storageObjectPathFromAnyPublicUrl(
  absoluteUrl: string
): string | null {
  const t = absoluteUrl?.trim() ?? "";
  if (!t) return null;
  try {
    const u = new URL(t);
    const m = u.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

/**
 * Storage key for an uploaded base floor plan, or null if not an uploaded object.
 * Accepts full public URLs or a raw `floorplans/…` key stored in the DB.
 */
export function floorplanUploadedStorageKey(
  imagePath: string | null | undefined,
  bucket?: string
): string | null {
  const t = imagePath?.trim() ?? "";
  if (!t || t === DEFAULT_FLOORPLAN_IMAGE_PATH) return null;
  if (t.startsWith("floorplans/")) return t;
  const fromAny = storageObjectPathFromAnyPublicUrl(t);
  if (fromAny) return fromAny;
  if (bucket) return storageObjectPathFromPublicUrl(t, bucket);
  return null;
}

/** True when active floorplan points at an uploaded file under storage `floorplans/`. */
export function floorplanHasRemovableBaseUpload(
  imagePath: string | null | undefined,
  bucket: string
): boolean {
  const t = imagePath?.trim() ?? "";
  if (!t || t === DEFAULT_FLOORPLAN_IMAGE_PATH) return false;
  const key = floorplanUploadedStorageKey(imagePath, bucket);
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
