"use client";

import type { PointerEvent } from "react";
import {
  effectiveLabelFill,
  effectiveLabelFontSize,
} from "@/lib/room-label-style";
import type { Room } from "@/lib/types";

const LABEL_TRANSITION =
  "opacity 0.25s ease, font-size 0.2s ease, transform 0.2s ease";

type Props = {
  rooms: Room[];
  editMode: boolean;
  selectedId?: string | null;
  hoveredId?: string | null;
  onLabelPointerDown?: (room: Room, e: PointerEvent<SVGTextElement>) => void;
};

export function FloorPlanRoomLabels({
  rooms,
  editMode,
  selectedId = null,
  hoveredId = null,
  onLabelPointerDown,
}: Props) {
  const anyFocused = !editMode && (hoveredId != null || selectedId != null);

  return (
    <>
      {rooms.map((room) => {
        const isSel = room.id === selectedId;
        const isHover = room.id === hoveredId;
        const isFocused = isSel || isHover;
        const isDimmed = anyFocused && !isFocused;

        const baseFontSize = effectiveLabelFontSize(room);
        const fs = isFocused ? baseFontSize * 1.08 : baseFontSize;

        let labelOpacity = 1;
        if (isDimmed) labelOpacity = 0.25;

        const fill = effectiveLabelFill(room);

        return (
          <text
            key={`${room.id}-label`}
            x={room.label_x}
            y={room.label_y}
            textAnchor="middle"
            fill={fill}
            opacity={labelOpacity}
            style={{
              fontFamily:
                "var(--font-body, ui-sans-serif), system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: `${fs}px`,
              fontWeight: isFocused ? 700 : 600,
              letterSpacing: isFocused ? "0.02em" : undefined,
              pointerEvents: editMode ? "auto" : "none",
              cursor: editMode ? "grab" : "default",
              textShadow: isFocused
                ? "0 0 4px rgba(255,255,255,0.35), 0 0.5px 2px rgba(0,0,0,0.9)"
                : "0 0.5px 2px rgba(0,0,0,0.9)",
              transition: LABEL_TRANSITION,
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
