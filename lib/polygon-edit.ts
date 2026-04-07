export type PlanPoint = { x: number; y: number };

const VIEW_MIN = 0;
const VIEW_MAX = 100;

export function clampPlanPoint(p: PlanPoint): PlanPoint {
  return {
    x: Math.max(VIEW_MIN, Math.min(VIEW_MAX, Number(p.x.toFixed(2)))),
    y: Math.max(VIEW_MIN, Math.min(VIEW_MAX, Number(p.y.toFixed(2)))),
  };
}

/** Closest point on segment AB to P; t is position along AB in [0, 1]. */
export function closestPointOnSegment(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number
): { x: number; y: number; t: number; distSq: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  let t = ab2 > 0 ? (apx * abx + apy * aby) / ab2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * abx;
  const y = ay + t * aby;
  const dx = px - x;
  const dy = py - y;
  return { x, y, t, distSq: dx * dx + dy * dy };
}

/** Insert vertex after edge edgeIndex (edge from pts[edgeIndex] → pts[edgeIndex+1], closed). */
export function insertVertexAfterEdge(
  pts: PlanPoint[],
  edgeIndex: number,
  point: PlanPoint
): PlanPoint[] {
  const n = pts.length;
  if (edgeIndex < 0 || edgeIndex >= n) return pts;
  const p = clampPlanPoint(point);
  return [...pts.slice(0, edgeIndex + 1), p, ...pts.slice(edgeIndex + 1)];
}

/** Remove vertex at index; returns null if that would leave fewer than 3 vertices. */
export function removePolygonVertex(
  pts: PlanPoint[],
  vertexIndex: number
): PlanPoint[] | null {
  if (pts.length <= 3 || vertexIndex < 0 || vertexIndex >= pts.length) {
    return null;
  }
  return pts.filter((_, j) => j !== vertexIndex);
}
