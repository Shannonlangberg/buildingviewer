"use client";

import { closestPointOnSegment, insertVertexAfterEdge } from "@/lib/polygon-edit";
import { svgClientToViewBox } from "@/lib/floorplan-edit";
import type { Room } from "@/lib/types";
import { parsePolygonPoints, serializePolygonPoints } from "@/lib/utils";
import type { RefObject } from "react";

/** Skip inserts too close to existing corners (keeps edges usable). */
const ENDPOINT_EPS = 0.07;

type Props = {
  room: Room | null;
  svgRef: RefObject<SVGSVGElement | null>;
  rooms: Room[];
  onRoomsDirty: (next: Room[]) => void;
};

/**
 * Invisible thick strokes along polygon edges: double-click to insert a vertex on that edge.
 */
export function PolygonEdgeInsertHandles({
  room,
  svgRef,
  rooms,
  onRoomsDirty,
}: Props) {
  if (!room || room.shape_type !== "polygon") return null;
  const pts = parsePolygonPoints(room.polygon_points);
  if (!pts?.length) return null;
  const n = pts.length;

  const applyInsert = (edgeIndex: number, clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const cur = rooms.find((r) => r.id === room.id);
    if (!cur || cur.shape_type !== "polygon") return;
    const latest = parsePolygonPoints(cur.polygon_points);
    if (!latest?.length) return;
    const nn = latest.length;
    if (edgeIndex < 0 || edgeIndex >= nn) return;
    const click = svgClientToViewBox(svg, clientX, clientY);
    const ax = latest[edgeIndex]!.x;
    const ay = latest[edgeIndex]!.y;
    const bx = latest[(edgeIndex + 1) % nn]!.x;
    const by = latest[(edgeIndex + 1) % nn]!.y;
    const { x, y, t } = closestPointOnSegment(
      ax,
      ay,
      bx,
      by,
      click.x,
      click.y
    );
    if (t < ENDPOINT_EPS || t > 1 - ENDPOINT_EPS) return;
    const merged = insertVertexAfterEdge(latest, edgeIndex, { x, y });
    onRoomsDirty(
      rooms.map((r) =>
        r.id === room.id
          ? { ...r, polygon_points: serializePolygonPoints(merged) }
          : r
      )
    );
  };

  return (
    <g className="polygon-edge-insert-handles" pointerEvents="auto">
      {pts.map((a, i) => {
        const b = pts[(i + 1) % n]!;
        return (
          <line
            key={`${room.id}-edge-${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="white"
            strokeOpacity={0}
            strokeWidth={3.2}
            strokeLinecap="round"
            style={{ cursor: "copy", pointerEvents: "stroke", touchAction: "none" }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              applyInsert(i, e.clientX, e.clientY);
            }}
          >
            <title>Double-click to add a corner on this edge</title>
          </line>
        );
      })}
    </g>
  );
}
