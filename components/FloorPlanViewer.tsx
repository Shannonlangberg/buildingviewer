"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyLayoutDragToRooms,
  type LayoutPointerDragState,
  svgClientToViewBox,
} from "@/lib/floorplan-edit";
import {
  effectiveLabelFill,
  effectiveLabelFontSize,
} from "@/lib/room-label-style";
import { removePolygonVertex } from "@/lib/polygon-edit";
import type { Floorplan, RectResizeHandleId, Room } from "@/lib/types";
import { parsePolygonPoints, serializePolygonPoints } from "@/lib/utils";
import { FloorPlanCanvas } from "./FloorPlanCanvas";
import { PolygonEdgeInsertHandles } from "./PolygonEdgeInsertHandles";
import { PolygonVertexHandles } from "./PolygonVertexHandles";
import { RectResizeHandles } from "./RectResizeHandles";
import { RoomZoneOverlay } from "./RoomZoneOverlay";

type Props = {
  floorplan: Floorplan | null;
  rooms: Room[];
  selectedId: string | null;
  onSelectRoom: (id: string) => void;
  editMode: boolean;
  onRoomsDirty?: (next: Room[]) => void;
  /** Base blueprint / image under zones (0–1). */
  baseLayerOpacity?: number;
};

export function FloorPlanViewer({
  floorplan,
  rooms,
  selectedId,
  onSelectRoom,
  editMode,
  onRoomsDirty,
  baseLayerOpacity,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [drag, setDrag] = useState<LayoutPointerDragState | null>(null);
  const [draggingRoomId, setDraggingRoomId] = useState<string | null>(null);
  const movedRef = useRef(false);

  const defaultBase = "/floorplans/mt-barker-base.svg";
  const selectedRoom =
    rooms.find((r) => r.id === selectedId) ?? null;

  const applyDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!drag || !svgRef.current || !onRoomsDirty) return;
      const cur = svgClientToViewBox(svgRef.current, clientX, clientY);
      const dx = cur.x - drag.startSvg.x;
      const dy = cur.y - drag.startSvg.y;
      if (Math.hypot(dx, dy) > 0.08) movedRef.current = true;
      const next = applyLayoutDragToRooms(
        rooms,
        drag,
        clientX,
        clientY,
        svgRef.current
      );
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

  const beginDrag = (
    next: LayoutPointerDragState,
    target: Element,
    e: React.PointerEvent
  ) => {
    movedRef.current = false;
    target.setPointerCapture?.(e.pointerId);
    setDraggingRoomId(next.roomId);
    setDrag(next);
  };

  const onPolygonMovePointerDown = (roomId: string, e: React.PointerEvent) => {
    if (!editMode || !onRoomsDirty || !svgRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.shape_type !== "polygon") return;
    const startSvg = svgClientToViewBox(svgRef.current, e.clientX, e.clientY);
    beginDrag(
      {
        kind: "polygon-move",
        roomId,
        startSvg,
        startRoom: { ...room },
        pointerId: e.pointerId,
      },
      e.target as Element,
      e
    );
  };

  const onRectMovePointerDown = (roomId: string, e: React.PointerEvent) => {
    if (!editMode || !onRoomsDirty || !svgRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.shape_type !== "rect") return;
    const startSvg = svgClientToViewBox(svgRef.current, e.clientX, e.clientY);
    beginDrag(
      {
        kind: "rect-move",
        roomId,
        startSvg,
        startRoom: { ...room },
        pointerId: e.pointerId,
      },
      e.target as Element,
      e
    );
  };

  const onPolygonVertexPointerDown = (
    roomId: string,
    vertexIndex: number,
    e: React.PointerEvent
  ) => {
    if (!editMode || !onRoomsDirty || !svgRef.current) return;
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.shape_type !== "polygon") return;

    if (e.altKey) {
      const parsed = parsePolygonPoints(room.polygon_points);
      const nextPts =
        parsed && removePolygonVertex(parsed, vertexIndex);
      if (nextPts) {
        e.preventDefault();
        e.stopPropagation();
        onRoomsDirty(
          rooms.map((r) =>
            r.id === roomId
              ? { ...r, polygon_points: serializePolygonPoints(nextPts) }
              : r
          )
        );
      }
      return;
    }

    const startSvg = svgClientToViewBox(svgRef.current, e.clientX, e.clientY);
    beginDrag(
      {
        kind: "polygon-vertex",
        roomId,
        vertexIndex,
        startSvg,
        startRoom: { ...room },
        pointerId: e.pointerId,
      },
      e.target as Element,
      e
    );
  };

  const onResizePointerDown = (
    roomId: string,
    handle: RectResizeHandleId,
    e: React.PointerEvent
  ) => {
    if (!editMode || !onRoomsDirty || !svgRef.current) return;
    const room = rooms.find((r) => r.id === roomId);
    if (!room || room.shape_type !== "rect") return;
    const startSvg = svgClientToViewBox(svgRef.current, e.clientX, e.clientY);
    beginDrag(
      {
        kind: "rect-resize",
        roomId,
        handle,
        startSvg,
        startRoom: { ...room },
        pointerId: e.pointerId,
      },
      e.target as Element,
      e
    );
  };

  const onLabelPointerDown = (room: Room, e: React.PointerEvent) => {
    if (!editMode || !onRoomsDirty || !svgRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const startSvg = svgClientToViewBox(svgRef.current, e.clientX, e.clientY);
    beginDrag(
      {
        kind: "label",
        roomId: room.id,
        startSvg,
        startRoom: { ...room },
        pointerId: e.pointerId,
      },
      e.target as Element,
      e
    );
  };

  const handleZoneClick = (id: string) => {
    if (editMode && movedRef.current) {
      movedRef.current = false;
      return;
    }
    onSelectRoom(id);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="relative h-full w-full">
        <FloorPlanCanvas
          floorplan={floorplan}
          fallbackImageSrc={defaultBase}
          svgRef={svgRef}
          baseLayerOpacity={baseLayerOpacity}
        >
          <RoomZoneOverlay
            rooms={rooms}
            selectedId={selectedId}
            hoveredId={hoveredId}
            editMode={editMode}
            onSelect={handleZoneClick}
            onHover={setHoveredId}
            draggingRoomId={draggingRoomId}
            onRectMovePointerDown={onRectMovePointerDown}
            onPolygonMovePointerDown={onPolygonMovePointerDown}
          />

          {editMode && onRoomsDirty && (
            <PolygonEdgeInsertHandles
              room={selectedRoom}
              svgRef={svgRef}
              rooms={rooms}
              onRoomsDirty={onRoomsDirty}
            />
          )}

          {rooms.map((room) => (
            <text
              key={`${room.id}-label`}
              x={room.label_x}
              y={room.label_y}
              textAnchor="middle"
              fill={effectiveLabelFill(room)}
              style={{
                fontFamily:
                  "var(--font-body, ui-sans-serif), system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: `${effectiveLabelFontSize(room)}px`,
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

          <RectResizeHandles
            room={selectedRoom}
            visible={editMode && Boolean(onRoomsDirty)}
            onResizePointerDown={onResizePointerDown}
          />

          <PolygonVertexHandles
            room={selectedRoom}
            visible={editMode && Boolean(onRoomsDirty)}
            onVertexPointerDown={onPolygonVertexPointerDown}
          />

        </FloorPlanCanvas>
      </div>

      {/* Compass rose — HTML overlay so it stays crisp at any size */}
      <div className="pointer-events-none absolute right-4 top-4 z-20 flex flex-col items-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.12] bg-black/55 shadow-xl shadow-black/40 backdrop-blur-md sm:h-[4.5rem] sm:w-[4.5rem]">
          {/* Outer tick ring */}
          <svg
            viewBox="0 0 72 72"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {Array.from({ length: 36 }).map((_, i) => {
              const a = i * 10 * (Math.PI / 180);
              const major = i % 9 === 0;
              const r1 = major ? 30 : 31.5;
              const r2 = 34;
              return (
                <line
                  key={i}
                  x1={36 + r1 * Math.sin(a)}
                  y1={36 - r1 * Math.cos(a)}
                  x2={36 + r2 * Math.sin(a)}
                  y2={36 - r2 * Math.cos(a)}
                  stroke={major ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}
                  strokeWidth={major ? 1.2 : 0.6}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Arrow */}
          <svg viewBox="0 0 40 40" className="relative h-9 w-9 sm:h-10 sm:w-10" aria-hidden>
            {/* North half — white/bright */}
            <path d="M20 4 L23 20 L20 18 L17 20 Z" fill="rgba(255,255,255,0.92)" />
            {/* South half — dim */}
            <path d="M20 36 L17 20 L20 22 L23 20 Z" fill="rgba(255,255,255,0.2)" />
            {/* Center dot */}
            <circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          </svg>

          {/* Cardinal labels */}
          <span className="absolute left-1/2 top-0.5 -translate-x-1/2 text-[9px] font-bold tracking-wide text-white/90 sm:text-[10px]">
            N
          </span>
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-white/30 sm:text-[9px]">
            S
          </span>
          <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[8px] font-semibold text-white/30 sm:text-[9px]">
            W
          </span>
          <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] font-semibold text-white/30 sm:text-[9px]">
            E
          </span>
        </div>
      </div>
    </div>
  );
}
