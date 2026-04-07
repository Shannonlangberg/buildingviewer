"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyLayoutDragToRooms,
  type LayoutPointerDragState,
  svgClientToViewBox,
} from "@/lib/floorplan-edit";
import type { Floorplan, RectResizeHandleId, Room } from "@/lib/types";
import { FloorPlanCanvas } from "./FloorPlanCanvas";
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
};

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
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0a0e14",
        boxSizing: "border-box",
      }}
    >
      <div
        className="relative aspect-[4/3] w-full"
        style={{ position: "relative", width: "100%", aspectRatio: "4 / 3" }}
      >
        <FloorPlanCanvas
          floorplan={floorplan}
          fallbackImageSrc={defaultBase}
          svgRef={svgRef}
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

          {rooms.map((room) => (
            <text
              key={`${room.id}-label`}
              x={room.label_x}
              y={room.label_y}
              textAnchor="middle"
              fill="rgba(248,250,252,0.92)"
              style={{
                fontFamily:
                  "var(--font-body, ui-sans-serif), system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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
              style={{
                fontSize: "1.8px",
                fontWeight: 700,
                fontFamily:
                  "var(--font-body, ui-sans-serif), system-ui, sans-serif",
              }}
            >
              N
            </text>
          </g>
        </FloorPlanCanvas>
      </div>
    </div>
  );
}
