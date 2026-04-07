"use client";

import type { PointerEvent } from "react";
import {
  effectiveLabelFill,
  effectiveLabelFontSize,
} from "@/lib/room-label-style";
import type { Room } from "@/lib/types";

type Props = {
  rooms: Room[];
  editMode: boolean;
  onLabelPointerDown?: (room: Room, e: PointerEvent<SVGTextElement>) => void;
};

export function FloorPlanRoomLabels({
  rooms,
  editMode,
  onLabelPointerDown,
}: Props) {
  return (
    <>
      {rooms.map((room) => {
        const fs = effectiveLabelFontSize(room);
        const w = Math.min(
          44,
          Math.max(fs * 2.4, room.name.length * fs * 0.62 + fs * 1.1)
        );
        const h = fs * 1.5;
        const pillTop = room.label_y - h + fs * 0.15;
        return (
          <g key={`${room.id}-label-stack`}>
            <rect
              x={room.label_x - w / 2}
              y={pillTop}
              width={w}
              height={h}
              rx={Math.min(1.25, h * 0.32)}
              ry={Math.min(1.25, h * 0.32)}
              fill="rgba(8,12,20,0.58)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={0.14}
              pointerEvents="none"
            />
            <text
              x={room.label_x}
              y={room.label_y}
              textAnchor="middle"
              fill={effectiveLabelFill(room)}
              style={{
                fontFamily:
                  "var(--font-body, ui-sans-serif), system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: `${fs}px`,
                fontWeight: 600,
                pointerEvents: editMode ? "auto" : "none",
                cursor: editMode ? "grab" : "default",
                textShadow: "0 0.5px 2px rgba(0,0,0,0.9)",
              }}
              onPointerDown={(e) => onLabelPointerDown?.(room, e)}
            >
              {room.name}
            </text>
          </g>
        );
      })}
    </>
  );
}
