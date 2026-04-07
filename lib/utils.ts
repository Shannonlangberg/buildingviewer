import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parsePolygonPoints(
  raw: string | null
): { x: number; y: number }[] | null {
  if (!raw?.trim()) return null;
  const pairs = raw.trim().split(/\s+/);
  const pts: { x: number; y: number }[] = [];
  for (const p of pairs) {
    const [xs, ys] = p.split(",");
    const x = Number(xs);
    const y = Number(ys);
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
  }
  return pts.length >= 3 ? pts : null;
}

export function formatUploadDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
