"use client";

import { parsePolygonPoints } from "@/lib/utils";
import type { Room } from "@/lib/types";

const R = 0.62;
const STROKE = "rgba(248,250,252,0.9)";
const FILL = "rgba(15,23,42,0.95)";

type Props = {
  room: Room | null;
  visible: boolean;
  onVertexPointerDown: (
    roomId: string,
    vertexIndex: number,
    e: React.PointerEvent
  ) => void;
};

/**
 * Draggable vertices for the selected polygon zone (shape edit).
 */
export function PolygonVertexHandles({
  room,
  visible,
  onVertexPointerDown,
}: Props) {
  if (!visible || !room || room.shape_type !== "polygon") return null;
  const pts = parsePolygonPoints(room.polygon_points);
  if (!pts?.length) return null;

  const pointsAttr = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <g className="polygon-vertex-handles" pointerEvents="auto">
      <polygon
        points={pointsAttr}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={0.2}
        strokeDasharray="0.45 0.4"
        pointerEvents="none"
      />
      {pts.map((p, i) => (
        <circle
          key={`${room.id}-v-${i}`}
          cx={p.x}
          cy={p.y}
          r={R}
          fill={FILL}
          stroke={STROKE}
          strokeWidth={0.14}
          style={{ cursor: "grab", touchAction: "none" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onVertexPointerDown(room.id, i, e);
          }}
        />
      ))}
    </g>
  );
}
