"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CapabilitiesPayload } from "@/lib/server-capabilities";
import {
  effectiveLabelFill,
  effectiveLabelFontSize,
} from "@/lib/room-label-style";
import type { BaseImageTransform, Floorplan, Room } from "@/lib/types";
import { DEFAULT_BASE_IMAGE_TRANSFORM } from "./FloorPlanCanvas";
import { FloorPlanEditor } from "./FloorPlanEditor";
import { FloorPlanViewer } from "./FloorPlanViewer";
import { RoomDetailPanel } from "./RoomDetailPanel";
import { RoomSidebar } from "./RoomSidebar";

const LAYOUT_SESSION_KEY = "mtb-layout-tools-on";
const FLOORPLAN_BASE_OPACITY_KEY = "mtb-floorplan-base-opacity";
const FLOORPLAN_BASE_TRANSFORM_KEY = "mtb-floorplan-base-transform";
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

  const [baseImageTransform, setBaseImageTransform] =
    useState<BaseImageTransform>(() => {
      const fp = initialFloorplan?.base_image_transform;
      if (fp && typeof fp.scale === "number") {
        return { scale: fp.scale, offsetX: fp.offsetX ?? 0, offsetY: fp.offsetY ?? 0 };
      }
      return DEFAULT_BASE_IMAGE_TRANSFORM;
    });

  useEffect(() => {
    const fp = floorplan?.base_image_transform;
    const isNonDefault = (t: BaseImageTransform) =>
      t.scale !== 1 || t.offsetX !== 0 || t.offsetY !== 0;

    const serverHasCustom =
      fp && typeof fp.scale === "number" && isNonDefault(fp as BaseImageTransform);

    if (serverHasCustom) {
      const next = { scale: fp!.scale, offsetX: fp!.offsetX ?? 0, offsetY: fp!.offsetY ?? 0 };
      setBaseImageTransform(next);
      try {
        localStorage.setItem(FLOORPLAN_BASE_TRANSFORM_KEY, JSON.stringify(next));
      } catch { /* private mode */ }
      return;
    }

    let local: BaseImageTransform | null = null;
    try {
      const raw = localStorage.getItem(FLOORPLAN_BASE_TRANSFORM_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BaseImageTransform>;
        local = {
          scale: parsed.scale ?? 1,
          offsetX: parsed.offsetX ?? 0,
          offsetY: parsed.offsetY ?? 0,
        };
      }
    } catch { /* private mode */ }

    if (local && isNonDefault(local)) {
      setBaseImageTransform(local);
      fetch("/api/floorplans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_image_transform: local }),
      }).catch(() => {});
    }
  }, [floorplan]);

  const saveTransformTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setBaseImageTransformPersisted = useCallback(
    (next: BaseImageTransform) => {
      setBaseImageTransform(next);
      try {
        localStorage.setItem(FLOORPLAN_BASE_TRANSFORM_KEY, JSON.stringify(next));
      } catch { /* private mode */ }
      if (saveTransformTimer.current) clearTimeout(saveTransformTimer.current);
      saveTransformTimer.current = setTimeout(() => {
        fetch("/api/floorplans", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base_image_transform: next }),
        }).catch(() => {});
      }, 800);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capabilities")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CapabilitiesPayload | null) => {
        if (!cancelled && data && typeof data.canPersist === "boolean") {
          setLiveCapabilities(data);
        }
      })
      .catch(() => {});
    fetch("/api/floorplans", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { floorplan?: Floorplan } | null) => {
        if (!cancelled && data?.floorplan) {
          setFloorplan(data.floorplan);
        }
      })
      .catch(() => {});
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

  const [mobileTab, setMobileTab] = useState<"plan" | "rooms" | "gallery">("plan");

  return (
    <div className={`flex flex-col bg-app-bg text-gray-200 ${editMode ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]"}`}>
      <header className="shrink-0 sticky top-0 z-40 border-b border-white/10 bg-app-header">
        <div className="relative mx-auto flex h-12 max-w-[1600px] items-center justify-between px-3 sm:h-16 sm:px-7">
          <div className="flex w-20 shrink-0 items-center sm:w-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Futures Church"
              className="h-8 w-8 object-contain sm:h-9 sm:w-9"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <h1 className="pointer-events-auto text-sm font-semibold tracking-tight text-white sm:text-lg">
              Mt Barker Building
            </h1>
          </div>
          <div className="flex w-20 shrink-0 justify-end sm:w-32">
            {!showEditChrome && (
              <button
                type="button"
                onClick={unlockLayoutTools}
                className="rounded-lg border border-white/15 bg-app-panel px-2.5 py-1.5 text-[11px] font-medium text-gray-200 shadow-sm transition active:scale-95 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs"
              >
                Layout tools
              </button>
            )}
          </div>
        </div>
      </header>

      {showEditChrome && (
        <div className={`mx-auto w-full max-w-[1600px] px-3 pt-4 sm:px-6 sm:pt-6 ${editMode ? "shrink-0 overflow-y-auto" : ""}`} style={editMode ? { maxHeight: "40vh" } : undefined}>
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
            baseImageTransform={baseImageTransform}
            onBaseImageTransformChange={setBaseImageTransformPersisted}
          />
        </div>
      )}

      {/* ─── MOBILE TAB BAR (below lg) ─── */}
      <div className="shrink-0 sticky top-12 z-30 flex border-b border-white/10 bg-app-header/95 backdrop-blur-md lg:hidden">
        {(["plan", "rooms", "gallery"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider transition ${
              mobileTab === tab
                ? "border-b-2 border-orange-500 text-orange-300"
                : "text-gray-500 active:text-gray-300"
            }`}
          >
            {tab === "plan" ? "Floor Plan" : tab === "rooms" ? "Rooms" : "Gallery"}
          </button>
        ))}
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className={`canvas-texture relative flex-1 ${editMode ? "min-h-0 overflow-hidden" : ""}`}>
        {/* ─── DESKTOP: floating panels over full canvas ─── */}
        <div className="absolute inset-0 hidden lg:block">
          <FloorPlanViewer
            floorplan={floorplan}
            rooms={displayRooms}
            selectedId={selectedId}
            onSelectRoom={setSelectedId}
            editMode={editMode}
            onRoomsDirty={editMode ? setDraftRooms : undefined}
            baseLayerOpacity={baseLayerOpacity}
            baseImageTransform={baseImageTransform}
          />
        </div>
        <div className={`pointer-events-none relative z-10 hidden flex-col gap-4 p-5 lg:flex lg:flex-row lg:items-stretch ${editMode ? "h-full" : "min-h-[calc(100dvh-4rem)]"}`}>
          <div className="pointer-events-auto w-[250px] shrink-0 xl:w-[270px]">
            <RoomSidebar
              rooms={displayRooms}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <div className="flex-1" />
          <div className="pointer-events-auto w-[340px] shrink-0 xl:w-[380px]">
            <RoomDetailPanel
              room={selectedRoom}
              editMode={editMode}
              onRoomsRefresh={refreshData}
              canPersist={writesEnabled}
              onDraftRoomPatch={editMode ? patchDraftRoom : undefined}
            />
          </div>
        </div>

        {/* ─── MOBILE: tabbed panels ─── */}
        <div className="flex flex-col lg:hidden">
          {/* Floor plan tab */}
          <div className={mobileTab === "plan" ? "block" : "hidden"}>
            <div className="relative h-[55dvh] min-h-[260px]">
              <FloorPlanViewer
                floorplan={floorplan}
                rooms={displayRooms}
                selectedId={selectedId}
                onSelectRoom={(id) => {
                  setSelectedId(id);
                  if (id) setMobileTab("gallery");
                }}
                editMode={editMode}
                onRoomsDirty={editMode ? setDraftRooms : undefined}
                baseLayerOpacity={baseLayerOpacity}
                baseImageTransform={baseImageTransform}
              />
            </div>
            {selectedRoom && (
              <div className="border-t border-white/10 bg-app-header/80 px-4 py-3 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setMobileTab("gallery")}
                  className="flex w-full items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/[0.08] px-4 py-3 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: selectedRoom.color }}
                    />
                    <span className="text-sm font-semibold text-white">{selectedRoom.name}</span>
                  </div>
                  <span className="text-xs text-orange-300">View gallery →</span>
                </button>
              </div>
            )}
          </div>

          {/* Rooms tab */}
          <div className={mobileTab === "rooms" ? "block p-3" : "hidden"}>
            <RoomSidebar
              rooms={displayRooms}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setMobileTab("gallery");
              }}
            />
          </div>

          {/* Gallery tab */}
          <div className={mobileTab === "gallery" ? "block p-3" : "hidden"}>
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

      <footer className="mt-auto shrink-0 border-t border-white/10 bg-app-header" style={{ paddingBottom: "max(0.875rem, var(--safe-bottom))" }}>
        <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-2 px-5 pt-3 text-center text-[11px] text-gray-500 sm:pt-4">
          <span>© {new Date().getFullYear()} Mt Barker Building</span>
        </div>
      </footer>

    </div>
  );
}
