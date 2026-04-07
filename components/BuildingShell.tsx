"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Floorplan, Room } from "@/lib/types";
import { FloorPlanEditor } from "./FloorPlanEditor";
import { FloorPlanViewer } from "./FloorPlanViewer";
import { RoomDetailPanel } from "./RoomDetailPanel";
import { RoomSidebar } from "./RoomSidebar";

type Props = {
  initialRooms: Room[];
  initialFloorplan: Floorplan | null;
};

export function BuildingShell({ initialRooms, initialFloorplan }: Props) {
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [floorplan, setFloorplan] = useState<Floorplan | null>(
    initialFloorplan
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRooms[0]?.id ?? null
  );
  const [editMode, setEditMode] = useState(false);
  const [draftRooms, setDraftRooms] = useState<Room[]>(initialRooms);
  const [savingLayout, setSavingLayout] = useState(false);

  const showEditChrome =
    process.env.NEXT_PUBLIC_SHOW_FLOORPLAN_EDIT === "true" ||
    searchParams.get("edit") === "1";

  const canPersist = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

  const refreshData = useCallback(async () => {
    try {
      const [rRes, fRes] = await Promise.all([
        fetch("/api/rooms"),
        fetch("/api/floorplans"),
      ]);
      const rJson = await rRes.json();
      const fJson = await fRes.json();
      if (Array.isArray(rJson.rooms)) {
        setRooms(rJson.rooms);
        if (editMode) setDraftRooms(rJson.rooms);
      }
      if (fJson.floorplan) setFloorplan(fJson.floorplan);
    } catch {
      /* keep existing */
    }
  }, [editMode]);

  const displayRooms = editMode ? draftRooms : rooms;

  const selectedRoom = useMemo(
    () => displayRooms.find((r) => r.id === selectedId) ?? null,
    [displayRooms, selectedId]
  );

  const toggleEdit = () => {
    setEditMode((v) => {
      const next = !v;
      setDraftRooms(rooms);
      return next;
    });
  };

  const saveLayout = async () => {
    setSavingLayout(true);
    try {
      const updates = draftRooms.map((r) => ({
        id: r.id,
        label_x: r.label_x,
        label_y: r.label_y,
        rect_x: r.rect_x,
        rect_y: r.rect_y,
        rect_width: r.rect_width,
        rect_height: r.rect_height,
        polygon_points: r.polygon_points,
      }));
      const res = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error("Save failed");
      await refreshData();
      setEditMode(false);
    } catch {
      /* toast optional */
    } finally {
      setSavingLayout(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-slate-200">
      <header className="border-b border-white/[0.06] bg-[#070a0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Mt Barker Building
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Interactive campus floor plan & room galleries
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(280px,380px)] lg:items-start">
          <RoomSidebar
            rooms={displayRooms}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <FloorPlanViewer
            floorplan={floorplan}
            rooms={displayRooms}
            selectedId={selectedId}
            onSelectRoom={setSelectedId}
            editMode={editMode}
            onRoomsDirty={editMode ? setDraftRooms : undefined}
          />
          <RoomDetailPanel
            room={selectedRoom}
            editMode={editMode}
            onRoomsRefresh={refreshData}
            canPersist={canPersist}
          />
        </div>
      </main>

      {showEditChrome && (
        <FloorPlanEditor
          editMode={editMode}
          selectedRoom={selectedRoom}
          draftRooms={draftRooms}
          saving={savingLayout}
          onSaveLayout={() => void saveLayout()}
          onToggleEdit={toggleEdit}
          canPersist={canPersist}
        />
      )}
    </div>
  );
}
