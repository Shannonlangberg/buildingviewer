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
    <div
      className="relative min-h-screen text-slate-200"
      style={{
        background:
          "radial-gradient(ellipse 100% 75% at 50% -28%, rgba(34, 211, 238, 0.11), transparent 52%), radial-gradient(ellipse 55% 45% at 100% 0%, rgba(124, 58, 237, 0.09), transparent 50%), radial-gradient(ellipse 50% 38% at 0% 92%, rgba(14, 165, 233, 0.06), transparent 42%), #060912",
      }}
    >
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#060912]/70 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[#060912]/45">
        <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-4 px-4 py-5 sm:items-center sm:px-6">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-white sm:text-[1.65rem] sm:leading-tight">
              Mt Barker Building
            </h1>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-400">
              Interactive campus floor plan & room galleries
            </p>
          </div>
          {!showEditChrome && (
            <button
              type="button"
              onClick={unlockLayoutTools}
              className="shrink-0 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-100 shadow-lg shadow-cyan-500/[0.06] ring-1 ring-white/[0.06] transition hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-50 hover:shadow-amber-500/10"
            >
              Layout tools
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        {showEditChrome && (
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
        )}
        <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(280px,380px)] lg:items-start lg:gap-8">
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
            baseLayerOpacity={baseLayerOpacity}
          />
          <RoomDetailPanel
            room={selectedRoom}
            editMode={editMode}
            onRoomsRefresh={refreshData}
            canPersist={writesEnabled}
            onDraftRoomPatch={editMode ? patchDraftRoom : undefined}
          />
        </div>
      </main>
    </div>
  );
}
