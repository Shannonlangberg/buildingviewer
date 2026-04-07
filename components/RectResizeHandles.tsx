"use client";

import type { RectResizeHandleId, Room } from "@/lib/types";

const R = 0.55;
const STROKE = "rgba(148,163,184,0.85)";
const FILL = "rgba(15,23,42,0.92)";

type Props = {
  room: Room | null;
  visible: boolean;
  onResizePointerDown: (
    roomId: string,
    handle: RectResizeHandleId,
    e: React.PointerEvent
  ) => void;
};

const CURSOR: Record<RectResizeHandleId, string> = {
  se: "nwse-resize",
  e: "ew-resize",
  s: "ns-resize",
};

function Handle({
  cx,
  cy,
  hid,
  roomId,
  onResizePointerDown,
}: {
  cx: number;
  cy: number;
  hid: RectResizeHandleId;
  roomId: string;
  onResizePointerDown: Props["onResizePointerDown"];
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={R}
      fill={FILL}
      stroke={STROKE}
      strokeWidth={0.12}
      style={{ cursor: CURSOR[hid], touchAction: "none" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onResizePointerDown(roomId, hid, e);
      }}
    />
  );
}

/**
 * SVG overlay handles for resizing the selected rectangular zone in edit mode.
 * Render after room fills so handles sit on top.
 */
export function RectResizeHandles({
  room,
  visible,
  onResizePointerDown,
}: Props) {
  if (!visible || !room || room.shape_type !== "rect") return null;
  const x = room.rect_x ?? 0;
  const y = room.rect_y ?? 0;
  const w = room.rect_width ?? 0;
  const h = room.rect_height ?? 0;
  if (w <= 0 || h <= 0) return null;

  return (
    <g className="rect-resize-handles" pointerEvents="auto">
      <Handle
        hid="se"
        roomId={room.id}
        cx={x + w}
        cy={y + h}
        onResizePointerDown={onResizePointerDown}
      />
      <Handle
        hid="e"
        roomId={room.id}
        cx={x + w}
        cy={y + h / 2}
        onResizePointerDown={onResizePointerDown}
      />
      <Handle
        hid="s"
        roomId={room.id}
        cx={x + w / 2}
        cy={y + h}
        onResizePointerDown={onResizePointerDown}
      />
    </g>
  );
}
