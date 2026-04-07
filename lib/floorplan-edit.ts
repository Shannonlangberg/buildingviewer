import type { RectResizeHandleId, Room } from "./types";
import { parsePolygonPoints, serializePolygonPoints } from "./utils";

export type LayoutPointerDragKind =
  | "label"
  | "rect-move"
  | "rect-resize"
  | "polygon-move"
  | "polygon-vertex";

export type LayoutPointerDragState =
  | {
      kind: "label";
      roomId: string;
      startSvg: { x: number; y: number };
      startRoom: Room;
      pointerId: number;
    }
  | {
      kind: "rect-move";
      roomId: string;
      startSvg: { x: number; y: number };
      startRoom: Room;
      pointerId: number;
    }
  | {
      kind: "rect-resize";
      roomId: string;
      handle: RectResizeHandleId;
      startSvg: { x: number; y: number };
      startRoom: Room;
      pointerId: number;
    }
  | {
      kind: "polygon-move";
      roomId: string;
      startSvg: { x: number; y: number };
      startRoom: Room;
      pointerId: number;
    }
  | {
      kind: "polygon-vertex";
      roomId: string;
      vertexIndex: number;
      startSvg: { x: number; y: number };
      startRoom: Room;
      pointerId: number;
    };

const VIEW_MIN = 0;
const VIEW_MAX = 100;
const MIN_RECT_SIZE = 1;

export function svgClientToViewBox(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/** Keep rect inside the 0–100 plan; enforce minimum size. */
export function clampRectInViewBox(
  rectX: number,
  rectY: number,
  width: number,
  height: number
): { rect_x: number; rect_y: number; rect_width: number; rect_height: number } {
  let w = Math.max(MIN_RECT_SIZE, width);
  let h = Math.max(MIN_RECT_SIZE, height);
  let x = rectX;
  let y = rectY;
  if (x + w > VIEW_MAX) w = Math.max(MIN_RECT_SIZE, VIEW_MAX - x);
  if (y + h > VIEW_MAX) h = Math.max(MIN_RECT_SIZE, VIEW_MAX - y);
  x = Math.max(VIEW_MIN, Math.min(x, VIEW_MAX - w));
  y = Math.max(VIEW_MIN, Math.min(y, VIEW_MAX - h));
  return {
    rect_x: Number(x.toFixed(2)),
    rect_y: Number(y.toFixed(2)),
    rect_width: Number(w.toFixed(2)),
    rect_height: Number(h.toFixed(2)),
  };
}

export function applyLayoutDragToRooms(
  rooms: Room[],
  drag: LayoutPointerDragState,
  clientX: number,
  clientY: number,
  svg: SVGSVGElement
): Room[] {
  const cur = svgClientToViewBox(svg, clientX, clientY);
  const dx = cur.x - drag.startSvg.x;
  const dy = cur.y - drag.startSvg.y;

  return rooms.map((r) => {
    if (r.id !== drag.roomId) return r;

    if (drag.kind === "label") {
      return {
        ...r,
        label_x: Number((drag.startRoom.label_x + dx).toFixed(2)),
        label_y: Number((drag.startRoom.label_y + dy).toFixed(2)),
      };
    }

    if (drag.kind === "rect-move" && r.shape_type === "rect") {
      const sx = drag.startRoom.rect_x ?? 0;
      const sy = drag.startRoom.rect_y ?? 0;
      const sw = drag.startRoom.rect_width ?? 0;
      const sh = drag.startRoom.rect_height ?? 0;
      const nx = sx + dx;
      const ny = sy + dy;
      const c = clampRectInViewBox(nx, ny, sw, sh);
      return { ...r, ...c };
    }

    if (drag.kind === "rect-resize" && r.shape_type === "rect") {
      const sx = drag.startRoom.rect_x ?? 0;
      const sy = drag.startRoom.rect_y ?? 0;
      const sw = drag.startRoom.rect_width ?? 0;
      const sh = drag.startRoom.rect_height ?? 0;
      let nw = sw;
      let nh = sh;
      if (drag.handle === "se" || drag.handle === "e") nw = sw + dx;
      if (drag.handle === "se" || drag.handle === "s") nh = sh + dy;
      const c = clampRectInViewBox(sx, sy, nw, nh);
      return { ...r, ...c };
    }

    if (drag.kind === "polygon-move" && r.shape_type === "polygon") {
      const parsed = parsePolygonPoints(drag.startRoom.polygon_points);
      if (!parsed) return r;
      const moved = parsed.map((p) => ({
        x: Math.max(VIEW_MIN, Math.min(VIEW_MAX, p.x + dx)),
        y: Math.max(VIEW_MIN, Math.min(VIEW_MAX, p.y + dy)),
      }));
      return {
        ...r,
        polygon_points: serializePolygonPoints(moved),
      };
    }

    if (drag.kind === "polygon-vertex" && r.shape_type === "polygon") {
      const parsed = parsePolygonPoints(drag.startRoom.polygon_points);
      if (
        !parsed ||
        drag.vertexIndex < 0 ||
        drag.vertexIndex >= parsed.length
      ) {
        return r;
      }
      const orig = parsed[drag.vertexIndex];
      const nx = Math.max(
        VIEW_MIN,
        Math.min(VIEW_MAX, orig.x + dx)
      );
      const ny = Math.max(
        VIEW_MIN,
        Math.min(VIEW_MAX, orig.y + dy)
      );
      const next = [...parsed];
      next[drag.vertexIndex] = { x: nx, y: ny };
      return {
        ...r,
        polygon_points: serializePolygonPoints(next),
      };
    }

    return r;
  });
}
