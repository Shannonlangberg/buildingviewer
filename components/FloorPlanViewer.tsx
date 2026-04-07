"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Floorplan, Room } from "@/lib/types";
import { RoomZoneOverlay } from "./RoomZoneOverlay";

type Props = {
  floorplan: Floorplan | null;
  rooms: Room[];
  selectedId: string | null;
  onSelectRoom: (id: string) => void;
  editMode: boolean;
  onRoomsDirty?: (next: Room[]) => void;
};

type DragState =
  | {
      kind: "label" | "rect";
      roomId: string;
      startSvg: { x: number; y: number };
      startRoom: Room;
      pointerId: number;
    }
  | null;

function svgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

export function FloorPlanViewer({
  floorplan,
  rooms,
  selectedId,
  onSelectRoom,
  editMode,
  onRoomsDirty,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [draggingRoomId, setDraggingRoomId] = useState<string | null>(null);
  const movedRef = useRef(false);

  const baseSrc = floorplan?.image_path ?? "/floorplans/mt-barker-base.svg";

  const defs = useMemo(
    () => (
      <defs>
        <filter id="zoneGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    ),
    []
  );

  const applyDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!drag || !svgRef.current || !onRoomsDirty) return;
      const cur = svgPoint(svgRef.current, clientX, clientY);
      const dx = cur.x - drag.startSvg.x;
      const dy = cur.y - drag.startSvg.y;
      if (Math.hypot(dx, dy) > 0.2) movedRef.current = true;

      const next = rooms.map((r) => {
        if (r.id !== drag.roomId) return r;
        if (drag.kind === "label") {
          return {
            ...r,
            label_x: Number((drag.startRoom.label_x + dx).toFixed(2)),
            label_y: Number((drag.startRoom.label_y + dy).toFixed(2)),
          };
        }
        if (r.shape_type !== "rect") return r;
        return {
          ...r,
          rect_x: Number(
            ((drag.startRoom.rect_x ?? 0) + dx).toFixed(2)
          ),
          rect_y: Number(
            ((drag.startRoom.rect_y ?? 0) + dy).toFixed(2)
          ),
        };
      });
      onRoomsDirty(next);
    },
    [drag, onRoomsDirty, rooms]
  );

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      applyDrag(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      setDrag(null);
      setDraggingRoomId(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, applyDrag]);

  const onRectPointerDown = (roomId: string, e: React.PointerEvent) => {
    if (!editMode || !onRoomsDirty || !svgRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    movedRef.current = false;
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.shape_type !== "rect") return;
    const startSvg = svgPoint(svgRef.current, e.clientX, e.clientY);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDraggingRoomId(roomId);
    setDrag({
      kind: "rect",
      roomId,
      startSvg,
      startRoom: { ...room },
      pointerId: e.pointerId,
    });
  };

  const onLabelPointerDown = (room: Room, e: React.PointerEvent) => {
    if (!editMode || !onRoomsDirty || !svgRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    movedRef.current = false;
    const startSvg = svgPoint(svgRef.current, e.clientX, e.clientY);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDraggingRoomId(room.id);
    setDrag({
      kind: "label",
      roomId: room.id,
      startSvg,
      startRoom: { ...room },
      pointerId: e.pointerId,
    });
  };

  const handleZoneClick = (id: string) => {
    if (editMode && movedRef.current) {
      movedRef.current = false;
      return;
    }
    onSelectRoom(id);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="relative aspect-[4/3] w-full">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full touch-none select-none"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Interactive floor plan"
        >
          {defs}
          {floorplan?.svg_content ? (
            <g
              dangerouslySetInnerHTML={{ __html: floorplan.svg_content }}
              className="opacity-[0.55]"
            />
          ) : (
            <image
              href={baseSrc}
              width={100}
              height={100}
              preserveAspectRatio="xMidYMid meet"
              className="opacity-[0.55]"
            />
          )}

          <RoomZoneOverlay
            rooms={rooms}
            selectedId={selectedId}
            hoveredId={hoveredId}
            editMode={editMode}
            onSelect={handleZoneClick}
            onHover={setHoveredId}
            draggingRoomId={draggingRoomId}
            onRectPointerDown={onRectPointerDown}
          />

          {rooms.map((room) => (
            <text
              key={`${room.id}-label`}
              x={room.label_x}
              y={room.label_y}
              textAnchor="middle"
              fill="rgba(248,250,252,0.92)"
              style={{
                fontSize: "2.1px",
                fontWeight: 600,
                pointerEvents: editMode ? "auto" : "none",
                cursor: editMode ? "grab" : "default",
                textShadow: "0 0.4px 1.2px rgba(0,0,0,0.85)",
              }}
              onPointerDown={(e) => onLabelPointerDown(room, e)}
            >
              {room.name}
            </text>
          ))}

          <g transform="translate(88 8)">
            <circle
              r="3.2"
              fill="rgba(15,23,42,0.65)"
              stroke="rgba(148,163,184,0.35)"
              strokeWidth="0.15"
            />
            <path
              d="M 0 -2.1 L 0.55 0.4 L 0 0.1 L -0.55 0.4 Z"
              fill="#e2e8f0"
            />
            <text
              x="0"
              y="-3.8"
              textAnchor="middle"
              fill="rgba(148,163,184,0.9)"
              style={{ fontSize: "1.8px", fontWeight: 700 }}
            >
              N
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
