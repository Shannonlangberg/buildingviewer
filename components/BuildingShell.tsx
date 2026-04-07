"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CapabilitiesPayload } from "@/lib/server-capabilities";
import {
  effectiveLabelFill,
  effectiveLabelFontSize,
} from "@/lib/room-label-style";
import type { Floorplan, Room } from "@/lib/types";
import { FloorPlanEditor } from "./FloorPlanEditor";
import { FloorPlanViewer } from "./FloorPlanViewer";
import { PresentationView } from "./PresentationView";
import { RoomDetailPanel } from "./RoomDetailPanel";
import { RoomSidebar } from "./RoomSidebar";

const LAYOUT_SESSION_KEY = "mtb-layout-tools-on";
const FLOORPLAN_BASE_OPACITY_KEY = "mtb-floorplan-base-opacity";
const DEFAULT_FLOORPLAN_BASE_OPACITY = 0.82;

function editQueryEnabled(search: string): boolean {
  const q = search.startsWith("?") ? search : `?${search}`;
  const p = new URLSearchParams(q);
  const e = (p.get("edit") ?? "").toLowerCase();
  if (e === "1" || e === "true" || e === "yes") return true;
  if (p.get("layout") === "1") return true;
  return false;
}

type Props = {
  initialRooms: Room[];
  initialFloorplan: Floorplan | null;
  /** From server `searchParams` on first paint (avoids useSearchParams SSR issues). */
  urlShowsLayoutTools: boolean;
  /** Supabase write capability from server render (refreshed client-side via /api/capabilities). */
  initialCapabilities: CapabilitiesPayload;
};

export function BuildingShell({
  initialRooms,
  initialFloorplan,
  urlShowsLayoutTools,
  initialCapabilities,
}: Props) {
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
  const [shapeBusy, setShapeBusy] = useState(false);
  const [layoutUnlocked, setLayoutUnlocked] = useState(false);
  const [liveCapabilities, setLiveCapabilities] =
    useState<CapabilitiesPayload | null>(null);
  const [roomColorSaving, setRoomColorSaving] = useState(false);
  const [roomNameSaving, setRoomNameSaving] = useState(false);
  const [labelStyleSaving, setLabelStyleSaving] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const [baseLayerOpacity, setBaseLayerOpacity] = useState(
    DEFAULT_FLOORPLAN_BASE_OPACITY
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FLOORPLAN_BASE_OPACITY_KEY);
      if (raw == null) return;
      const n = parseFloat(raw);
      if (!Number.isNaN(n)) {
        setBaseLayerOpacity(Math.min(1, Math.max(0, n)));
      }
    } catch {
      /* private mode */
    }
  }, []);

  const setBaseLayerOpacityPersisted = useCallback((next: number) => {
    const v = Math.min(1, Math.max(0, next));
    setBaseLayerOpacity(v);
    try {
      localStorage.setItem(FLOORPLAN_BASE_OPACITY_KEY, String(v));
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capabilities")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CapabilitiesPayload | null) => {
        if (!cancelled && data && typeof data.canPersist === "boolean") {
          setLiveCapabilities(data);
        }
      })
      .catch(() => {
        /* keep initialCapabilities from server */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const capabilities = liveCapabilities ?? initialCapabilities;
  const writesEnabled = capabilities.canPersist;

  useEffect(() => {
    try {
      if (sessionStorage.getItem(LAYOUT_SESSION_KEY) === "1") {
        setLayoutUnlocked(true);
      }
    } catch {
      /* private mode */
    }
    if (typeof window !== "undefined") {
      if (editQueryEnabled(window.location.search)) {
        try {
          sessionStorage.setItem(LAYOUT_SESSION_KEY, "1");
        } catch {
          /* ignore */
        }
        setLayoutUnlocked(true);
      }
    }
  }, []);

  const showEditChrome =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_SHOW_FLOORPLAN_EDIT === "true" ||
    urlShowsLayoutTools ||
    layoutUnlocked;

  const unlockLayoutTools = () => {
    setLayoutUnlocked(true);
    try {
      sessionStorage.setItem(LAYOUT_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const refreshData = useCallback(async (): Promise<Room[]> => {
    try {
      const [rRes, fRes] = await Promise.all([
        fetch("/api/rooms", { cache: "no-store" }),
        fetch("/api/floorplans", { cache: "no-store" }),
      ]);
      const rJson = await rRes.json();
      const fJson = await fRes.json();
      const list: Room[] = Array.isArray(rJson.rooms) ? rJson.rooms : [];
      setRooms(list);
      if (editMode) setDraftRooms(list);
      if (fJson.floorplan) setFloorplan(fJson.floorplan);
      return list;
    } catch {
      return [];
    }
  }, [editMode]);

  const addShape = async (shape_type: "rect" | "polygon") => {
    if (!writesEnabled) return;
    setShapeBusy(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shape_type }),
      });
      const j = (await res.json()) as { room?: Room; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Create failed");
      await refreshData();
      if (j.room?.id) setSelectedId(j.room.id);
    } catch {
      /* optional toast */
    } finally {
      setShapeBusy(false);
    }
  };

  const deleteSelectedShape = async () => {
    if (!writesEnabled || !selectedRoom) return;
    const toRemove = selectedRoom;
    if (
      !confirm(
        `Delete “${toRemove.name}”? Any images in this space are removed permanently.`
      )
    ) {
      return;
    }
    setShapeBusy(true);
    try {
      const res = await fetch(`/api/rooms/${toRemove.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Delete failed");
      }
      const list = await refreshData();
      setSelectedId(list[0]?.id ?? null);
    } catch {
      /* optional toast */
    } finally {
      setShapeBusy(false);
    }
  };

  const displayRooms = editMode ? draftRooms : rooms;

  const selectedRoom = useMemo(
    () => displayRooms.find((r) => r.id === selectedId) ?? null,
    [displayRooms, selectedId]
  );

  const patchDraftRoom = useCallback((id: string, patch: Partial<Room>) => {
    setDraftRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }, []);

  const saveRoomColorToDb = useCallback(
    async (roomId: string, color: string) => {
      if (!writesEnabled) return;
      setRoomColorSaving(true);
      try {
        const res = await fetch("/api/rooms", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: [{ id: roomId, color }] }),
        });
        if (!res.ok) return;
        await refreshData();
      } finally {
        setRoomColorSaving(false);
      }
    },
    [writesEnabled, refreshData]
  );

  const saveRoomNameToDb = useCallback(
    async (roomId: string, name: string) => {
      const trimmed = name.trim();
      if (!writesEnabled || !trimmed) return;
      setRoomNameSaving(true);
      try {
        const res = await fetch("/api/rooms", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: [{ id: roomId, name: trimmed }] }),
        });
        if (!res.ok) return;
        await refreshData();
      } finally {
        setRoomNameSaving(false);
      }
    },
    [writesEnabled, refreshData]
  );

  const saveRoomLabelStyleToDb = useCallback(
    async (
      roomId: string,
      style: { label_text_color: string; label_font_size: number }
    ) => {
      if (!writesEnabled) return;
      setLabelStyleSaving(true);
      try {
        const res = await fetch("/api/rooms", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates: [
              {
                id: roomId,
                label_text_color: style.label_text_color,
                label_font_size: style.label_font_size,
              },
            ],
          }),
        });
        if (!res.ok) return;
        await refreshData();
      } finally {
        setLabelStyleSaving(false);
      }
    },
    [writesEnabled, refreshData]
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
        name: r.name.trim() || "Untitled zone",
        label_x: r.label_x,
        label_y: r.label_y,
        label_text_color: effectiveLabelFill(r),
        label_font_size: effectiveLabelFontSize(r),
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
    <div className="flex min-h-screen flex-col bg-app-bg text-gray-200">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-app-header">
        <div className="relative mx-auto flex h-14 max-w-[1600px] items-center justify-between px-5 sm:h-16 sm:px-7">
          <div className="flex w-28 shrink-0 items-center gap-2 sm:w-32">
            <button
              type="button"
              onClick={() => setPresentMode(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-app-panel px-3 text-xs font-medium text-gray-300 transition hover:border-white/20 hover:bg-app-raised hover:text-white"
              title="Present floor plan fullscreen"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                />
              </svg>
              <span className="hidden sm:inline">Present</span>
            </button>
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <h1 className="pointer-events-auto text-base font-semibold tracking-tight text-white sm:text-lg">
              Mt Barker Building
            </h1>
          </div>
          <div className="flex w-28 shrink-0 justify-end sm:w-32">
            {!showEditChrome && (
              <button
                type="button"
                onClick={unlockLayoutTools}
                className="rounded-xl border border-white/15 bg-app-panel px-3 py-2 text-xs font-medium text-gray-200 shadow-sm transition hover:border-white/25 hover:bg-app-raised"
              >
                Layout tools
              </button>
            )}
          </div>
        </div>
      </header>

      {showEditChrome && (
        <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 sm:px-6">
          <FloorPlanEditor
            editMode={editMode}
            selectedRoom={selectedRoom}
            draftRooms={draftRooms}
            saving={savingLayout}
            shapeBusy={shapeBusy}
            onSaveLayout={() => void saveLayout()}
            onToggleEdit={toggleEdit}
            canPersist={writesEnabled}
            capabilities={capabilities}
            floorplan={floorplan}
            onFloorplanUploaded={() => void refreshData()}
            onAddRect={() => void addShape("rect")}
            onAddPolygon={() => void addShape("polygon")}
            onDeleteSelected={() => void deleteSelectedShape()}
            onRoomColorDraft={(roomId, color) => patchDraftRoom(roomId, { color })}
            onSaveRoomColor={(roomId, color) =>
              void saveRoomColorToDb(roomId, color)
            }
            roomColorSaving={roomColorSaving}
            onRoomNameDraft={(roomId, name) =>
              patchDraftRoom(roomId, { name })
            }
            onSaveRoomName={(roomId, name) =>
              void saveRoomNameToDb(roomId, name)
            }
            roomNameSaving={roomNameSaving}
            onLabelTextColorDraft={(roomId, hex) =>
              patchDraftRoom(roomId, { label_text_color: hex })
            }
            onLabelFontSizeDraft={(roomId, n) =>
              patchDraftRoom(roomId, { label_font_size: n })
            }
            onSaveLabelStyle={(roomId, style) =>
              void saveRoomLabelStyleToDb(roomId, style)
            }
            labelStyleSaving={labelStyleSaving}
            baseLayerOpacity={baseLayerOpacity}
            onBaseLayerOpacityChange={setBaseLayerOpacityPersisted}
          />
        </div>
      )}

      {/* Design-board layout: floor plan is the canvas, panels float on top */}
      <main className="canvas-texture relative flex-1">
        {/* Floor plan — fills entire main area as the canvas */}
        <div className="absolute inset-0">
          <FloorPlanViewer
            floorplan={floorplan}
            rooms={displayRooms}
            selectedId={selectedId}
            onSelectRoom={setSelectedId}
            editMode={editMode}
            onRoomsDirty={editMode ? setDraftRooms : undefined}
            baseLayerOpacity={baseLayerOpacity}
          />
        </div>

        {/* Floating panels on top */}
        <div className="pointer-events-none relative z-10 flex min-h-[calc(100vh-4rem)] flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-stretch">
          {/* Left: room sidebar */}
          <div className="pointer-events-auto w-full shrink-0 lg:w-[250px] xl:w-[270px]">
            <RoomSidebar
              rooms={displayRooms}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          {/* Middle: spacer — lets the floor plan show through */}
          <div className="hidden flex-1 lg:block" />

          {/* Right: gallery panel */}
          <div className="pointer-events-auto w-full shrink-0 lg:w-[340px] xl:w-[380px]">
            <RoomDetailPanel
              room={selectedRoom}
              editMode={editMode}
              onRoomsRefresh={refreshData}
              canPersist={writesEnabled}
              onDraftRoomPatch={editMode ? patchDraftRoom : undefined}
            />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-white/10 bg-app-header py-3.5 sm:py-4">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-2 px-5 text-center text-[11px] text-gray-500">
          <span>© {new Date().getFullYear()} Mt Barker Building</span>
        </div>
      </footer>

      <PresentationView
        open={presentMode}
        onClose={() => setPresentMode(false)}
        floorplan={floorplan}
        rooms={rooms}
      />
    </div>
  );
}
