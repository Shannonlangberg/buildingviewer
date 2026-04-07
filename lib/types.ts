export type RoomStatus = "pending" | "in_progress" | "confirmed";
export type ShapeType = "rect" | "polygon";

/** Resize affordances for rectangular zones in layout edit mode (SVG viewBox space). */
export type RectResizeHandleId = "se" | "e" | "s";

export interface Floorplan {
  id: string;
  name: string;
  slug: string;
  image_path: string | null;
  svg_content: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  slug: string;
  svg_zone_id: string | null;
  status: RoomStatus;
  color: string;
  label_x: number;
  label_y: number;
  shape_type: ShapeType;
  rect_x: number | null;
  rect_y: number | null;
  rect_width: number | null;
  rect_height: number | null;
  polygon_points: string | null;
  sort_order: number;
  created_at: string;
}

export interface RoomImage {
  id: string;
  room_id: string;
  storage_path: string;
  caption: string | null;
  uploaded_at: string;
  uploader_name: string | null;
  sort_order: number;
}

export interface RoomWithImages extends Room {
  room_images?: RoomImage[];
}

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  confirmed: "Confirmed",
};

export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
