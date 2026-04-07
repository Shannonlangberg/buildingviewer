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
        return (
          <text
            key={`${room.id}-label`}
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
        );
      })}
    </>
  );
}
