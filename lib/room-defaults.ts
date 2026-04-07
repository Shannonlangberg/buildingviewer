import {
  DEFAULT_LABEL_FONT_SIZE,
  DEFAULT_LABEL_TEXT_COLOR,
} from "./room-label-style";
import type { RoomStatus, ShapeType } from "./types";

/** Default geometry for a new rectangular zone (viewBox 0–100). */
export const DEFAULT_NEW_RECT = {
  rect_x: 40,
  rect_y: 38,
  rect_width: 18,
  rect_height: 14,
  label_x: 49,
  label_y: 45,
} as const;

/** Small quad as starter polygon (viewBox 0–100). */
export const DEFAULT_NEW_POLYGON_POINTS = "42,40 58,40 58,54 42,54";

export type NewRoomInsert = {
  id: string;
  name: string;
  slug: string;
  svg_zone_id: string;
  status: RoomStatus;
  color: string;
  label_x: number;
  label_y: number;
  label_text_color: string;
  label_font_size: number;
  shape_type: ShapeType;
  rect_x: number | null;
  rect_y: number | null;
  rect_width: number | null;
  rect_height: number | null;
  polygon_points: string | null;
  sort_order: number;
};

export function buildNewRoomRow(params: {
  id: string;
  slug: string;
  name: string;
  shape_type: ShapeType;
  sort_order: number;
  color?: string;
  status?: RoomStatus;
}): NewRoomInsert {
  const color = params.color ?? "#64748b";
  const status = params.status ?? "pending";
  if (params.shape_type === "polygon") {
    return {
      id: params.id,
      name: params.name,
      slug: params.slug,
      svg_zone_id: `zone-${params.slug}`,
      status,
      color,
      label_x: 50,
      label_y: 47,
      label_text_color: DEFAULT_LABEL_TEXT_COLOR,
      label_font_size: DEFAULT_LABEL_FONT_SIZE,
      shape_type: "polygon",
      rect_x: null,
      rect_y: null,
      rect_width: null,
      rect_height: null,
      polygon_points: DEFAULT_NEW_POLYGON_POINTS,
      sort_order: params.sort_order,
    };
  }
  return {
    id: params.id,
    name: params.name,
    slug: params.slug,
    svg_zone_id: `zone-${params.slug}`,
    status,
    color,
    label_x: DEFAULT_NEW_RECT.label_x,
    label_y: DEFAULT_NEW_RECT.label_y,
    label_text_color: DEFAULT_LABEL_TEXT_COLOR,
    label_font_size: DEFAULT_LABEL_FONT_SIZE,
    shape_type: "rect",
    rect_x: DEFAULT_NEW_RECT.rect_x,
    rect_y: DEFAULT_NEW_RECT.rect_y,
    rect_width: DEFAULT_NEW_RECT.rect_width,
    rect_height: DEFAULT_NEW_RECT.rect_height,
    polygon_points: null,
    sort_order: params.sort_order,
  };
}
