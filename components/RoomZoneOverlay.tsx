"use client";

import { parsePolygonPoints } from "@/lib/utils";
import type { Room } from "@/lib/types";

type Props = {
  rooms: Room[];
  selectedId: string | null;
  hoveredId: string | null;
  editMode: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  draggingRoomId: string | null;
  onRectPointerDown?: (roomId: string, e: React.PointerEvent) => void;
};

export function RoomZoneOverlay({
  rooms,
  selectedId,
  hoveredId,
  editMode,
  onSelect,
  onHover,
  draggingRoomId,
  onRectPointerDown,
}: Props) {
  return (
    <g className="room-zones">
      {rooms.map((room) => {
        const isSel = room.id === selectedId;
        const isHover = room.id === hoveredId;
        const dragging = room.id === draggingRoomId;
        const baseOpacity = editMode ? 0.42 : 0.34;
        const opacity =
          isSel || isHover || dragging
            ? Math.min(0.72, baseOpacity + 0.28)
            : baseOpacity;
        const strokeW = isSel ? 0.45 : isHover ? 0.35 : 0.22;
        const filter = isSel ? "url(#zoneGlow)" : undefined;

        const common = {
          fill: room.color,
          opacity,
          stroke: "rgba(255,255,255,0.35)",
          strokeWidth: strokeW,
          style: { cursor: editMode ? "grab" : "pointer" } as const,
          filter,
          onPointerEnter: () => onHover(room.id),
          onPointerLeave: () => onHover(null),
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelect(room.id);
          },
        };

        if (room.shape_type === "polygon") {
          const pts = parsePolygonPoints(room.polygon_points);
          if (!pts) return null;
          const d =
            pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
            " Z";
          return (
            <path
              key={room.id}
              d={d}
              {...common}
            />
          );
        }

        const x = room.rect_x ?? 0;
        const y = room.rect_y ?? 0;
        const w = room.rect_width ?? 0;
        const h = room.rect_height ?? 0;
        return (
          <rect
            key={room.id}
            x={x}
            y={y}
            width={w}
            height={h}
            rx={0.35}
            ry={0.35}
            {...common}
            onPointerDown={(e) => {
              if (editMode && onRectPointerDown) onRectPointerDown(room.id, e);
            }}
          />
        );
      })}
    </g>
  );
}
