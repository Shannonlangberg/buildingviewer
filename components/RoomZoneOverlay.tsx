"use client";

import { parsePolygonPoints } from "@/lib/utils";
import type { Room } from "@/lib/types";
import { ROOM_STATUS_LABELS } from "@/lib/types";

type Props = {
  rooms: Room[];
  selectedId: string | null;
  hoveredId: string | null;
  editMode: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  draggingRoomId: string | null;
  onRectMovePointerDown?: (roomId: string, e: React.PointerEvent) => void;
  onPolygonMovePointerDown?: (roomId: string, e: React.PointerEvent) => void;
};

const TRANSITION =
  "opacity 0.25s ease, stroke-width 0.25s ease, filter 0.25s ease, stroke 0.25s ease, stroke-dashoffset 0.25s ease";

export function RoomZoneOverlay({
  rooms,
  selectedId,
  hoveredId,
  editMode,
  onSelect,
  onHover,
  draggingRoomId,
  onRectMovePointerDown,
  onPolygonMovePointerDown,
}: Props) {
  const anyFocused = !editMode && (hoveredId != null || selectedId != null);

  return (
    <g className="room-zones">
      {rooms.map((room) => {
        const isSel = room.id === selectedId;
        const isHover = room.id === hoveredId;
        const dragging = room.id === draggingRoomId;
        const isFocused = isSel || isHover || dragging;
        const isDimmed = anyFocused && !isFocused;

        const baseOpacity = editMode ? 0.55 : 0.7;
        let opacity = baseOpacity;
        if (isDimmed) opacity = 0.4;
        else if (isSel || dragging) opacity = 0.92;
        else if (isHover) opacity = 0.85;

        const strokeW = isSel ? 0.6 : isHover ? 0.45 : 0.3;
        let filter: string | undefined;
        if (isSel) filter = "url(#zonePulseGlow)";
        else if (isHover && !editMode) filter = "url(#zoneGlowHover)";

        const stroke = isSel
          ? "rgba(255,255,255,0.7)"
          : isHover
            ? "rgba(255,255,255,0.55)"
            : "rgba(255,255,255,0.25)";

        const dashProps = {};

        const common = {
          fill: room.color,
          opacity,
          stroke,
          strokeWidth: strokeW,
          style: {
            cursor: editMode ? "grab" : "pointer",
            transition: TRANSITION,
          } as const,
          filter,
          ...dashProps,
          onPointerEnter: () => onHover(room.id),
          onPointerLeave: () => onHover(null),
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelect(room.id);
          },
        };

        const tip = `${room.name} — ${ROOM_STATUS_LABELS[room.status]}`;

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
              data-room-zone="true"
              {...common}
              onPointerDown={(e) => {
                if (editMode && onPolygonMovePointerDown)
                  onPolygonMovePointerDown(room.id, e);
              }}
            >
              <title>{tip}</title>
            </path>
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
            rx={0.4}
            ry={0.4}
            data-room-zone="true"
            {...common}
            onPointerDown={(e) => {
              if (editMode && onRectMovePointerDown)
                onRectMovePointerDown(room.id, e);
            }}
          >
            <title>{tip}</title>
          </rect>
        );
      })}
    </g>
  );
}
