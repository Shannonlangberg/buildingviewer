"use client";

import { parsePolygonPoints } from "@/lib/utils";
import type { Room } from "@/lib/types";
import { ROOM_STATUS_LABELS } from "@/lib/types";

type Props = {
  rooms: Room[];
  selectedId: string | null;
  hoveredId: string | null;
  editMode: boolean;
  /** When a room is selected, fade other zones (view mode only). */
  dimUnselected?: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  draggingRoomId: string | null;
  /** Begin moving a rectangular zone (not resize — handles are separate). */
  onRectMovePointerDown?: (roomId: string, e: React.PointerEvent) => void;
  /** Begin moving a polygon zone (e.g. auditorium) as a whole. */
  onPolygonMovePointerDown?: (roomId: string, e: React.PointerEvent) => void;
};

const TRANSITION =
  "opacity 0.22s ease, stroke-width 0.22s ease, filter 0.22s ease";

export function RoomZoneOverlay({
  rooms,
  selectedId,
  hoveredId,
  editMode,
  dimUnselected = false,
  onSelect,
  onHover,
  draggingRoomId,
  onRectMovePointerDown,
  onPolygonMovePointerDown,
}: Props) {
  return (
    <g className="room-zones">
      {rooms.map((room) => {
        const isSel = room.id === selectedId;
        const isHover = room.id === hoveredId;
        const dragging = room.id === draggingRoomId;
        const othersDimmed =
          dimUnselected && selectedId != null && !isSel && !isHover && !dragging;

        const baseOpacity = editMode ? 0.44 : 0.38;
        let opacity = baseOpacity;
        if (othersDimmed) opacity = Math.min(0.16, baseOpacity * 0.38);
        else if (isSel || dragging) opacity = Math.min(0.88, baseOpacity + 0.36);
        else if (isHover) opacity = Math.min(0.78, baseOpacity + 0.32);

        const strokeW = isSel ? 0.52 : isHover ? 0.4 : 0.24;
        let filter: string | undefined;
        if (isSel) filter = "url(#zoneGlow)";
        else if (isHover && !editMode) filter = "url(#zoneGlowHover)";

        const common = {
          fill: room.color,
          opacity,
          stroke: isSel
            ? "rgba(255,255,255,0.55)"
            : isHover
              ? "rgba(255,255,255,0.48)"
              : "rgba(255,255,255,0.32)",
          strokeWidth: strokeW,
          style: {
            cursor: editMode ? "grab" : "pointer",
            transition: TRANSITION,
          } as const,
          filter,
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
