import { svgClientToViewBox } from "./floorplan-edit";

/**
 * ViewBox center for pan/zoom (matches `FloorPlanCanvas` viewBox `0 0 100 100`).
 */
export const FLOORPLAN_VIEW_CX = 50;
export const FLOORPLAN_VIEW_CY = 50;

export type FloorplanViewport = {
  panX: number;
  panY: number;
  scale: number;
};

export const DEFAULT_FLOORPLAN_VIEWPORT: FloorplanViewport = {
  panX: 0,
  panY: 0,
  scale: 1,
};

export const FLOORPLAN_ZOOM_MIN = 0.55;
export const FLOORPLAN_ZOOM_MAX = 3.25;

export function clampFloorplanZoom(scale: number): number {
  return Math.min(FLOORPLAN_ZOOM_MAX, Math.max(FLOORPLAN_ZOOM_MIN, scale));
}

/** SVG `transform` for pan + zoom around plan center (viewBox units). */
export function buildFloorplanViewportTransform(
  v: FloorplanViewport
): string {
  const s = clampFloorplanZoom(v.scale);
  return `translate(${v.panX} ${v.panY}) translate(${FLOORPLAN_VIEW_CX} ${FLOORPLAN_VIEW_CY}) scale(${s}) translate(${-FLOORPLAN_VIEW_CX} ${-FLOORPLAN_VIEW_CY})`;
}

/** Map a point from root SVG (viewBox) space into pre-transform plan space. */
export function rootToPlan(
  root: { x: number; y: number },
  v: FloorplanViewport
): { x: number; y: number } {
  const s = clampFloorplanZoom(v.scale);
  const rx = root.x - v.panX;
  const ry = root.y - v.panY;
  return {
    x: FLOORPLAN_VIEW_CX + (rx - FLOORPLAN_VIEW_CX) / s,
    y: FLOORPLAN_VIEW_CY + (ry - FLOORPLAN_VIEW_CY) / s,
  };
}

export function planToRoot(
  plan: { x: number; y: number },
  v: FloorplanViewport
): { x: number; y: number } {
  const s = clampFloorplanZoom(v.scale);
  return {
    x: v.panX + FLOORPLAN_VIEW_CX + s * (plan.x - FLOORPLAN_VIEW_CX),
    y: v.panY + FLOORPLAN_VIEW_CY + s * (plan.y - FLOORPLAN_VIEW_CY),
  };
}

/** Screen → plan coordinates (accounts for viewport group when scale/pan ≠ default). */
export function svgClientToPlan(
  svg: SVGSVGElement,
  v: FloorplanViewport,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const root = svgClientToViewBox(svg, clientX, clientY);
  if (
    v.scale === 1 &&
    v.panX === 0 &&
    v.panY === 0
  ) {
    return root;
  }
  return rootToPlan(root, v);
}

/** Zoom toward cursor; keeps plan point under pointer fixed on screen. */
export function nextViewportForWheelZoom(
  v: FloorplanViewport,
  rootAtCursor: { x: number; y: number },
  factor: number
): FloorplanViewport {
  const nextScale = clampFloorplanZoom(v.scale * factor);
  const plan = rootToPlan(rootAtCursor, v);
  const panX =
    rootAtCursor.x -
    FLOORPLAN_VIEW_CX -
    nextScale * (plan.x - FLOORPLAN_VIEW_CX);
  const panY =
    rootAtCursor.y -
    FLOORPLAN_VIEW_CY -
    nextScale * (plan.y - FLOORPLAN_VIEW_CY);
  return { panX, panY, scale: nextScale };
}
