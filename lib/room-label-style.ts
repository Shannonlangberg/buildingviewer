import type { Room } from "./types";

export const DEFAULT_LABEL_TEXT_COLOR = "#f8fafc";
export const DEFAULT_LABEL_FONT_SIZE = 2.1;
export const LABEL_FONT_SIZE_MIN = 1.2;
export const LABEL_FONT_SIZE_MAX = 5;

/** Safe fill for SVG <text> (hex or short CSS colour). */
export function effectiveLabelFill(
  room: Pick<Room, "label_text_color">
): string {
  const t = room.label_text_color?.trim();
  if (t && t.length <= 40) return t;
  return DEFAULT_LABEL_TEXT_COLOR;
}

export function effectiveLabelFontSize(
  room: Pick<Room, "label_font_size">
): number {
  const n = room.label_font_size;
  const v =
    typeof n === "number" && Number.isFinite(n)
      ? n
      : DEFAULT_LABEL_FONT_SIZE;
  return Math.min(
    LABEL_FONT_SIZE_MAX,
    Math.max(LABEL_FONT_SIZE_MIN, v)
  );
}

/** For <input type="color"> — needs #rrggbb. */
export function hexForLabelColorPicker(room: Pick<Room, "label_text_color">) {
  const t = room.label_text_color?.trim() ?? "";
  return /^#[0-9A-Fa-f]{6}$/i.test(t) ? t : DEFAULT_LABEL_TEXT_COLOR;
}
