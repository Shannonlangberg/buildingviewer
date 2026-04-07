"use client";

import type { CapabilitiesPayload } from "@/lib/server-capabilities";
import type { Room } from "@/lib/types";
import { ROOM_STATUS_LABELS } from "@/lib/types";
import { FloorplanBaseUpload } from "./FloorplanBaseUpload";

type Props = {
  editMode: boolean;
  selectedRoom: Room | null;
  draftRooms: Room[];
  saving: boolean;
  shapeBusy: boolean;
  onSaveLayout: () => void;
  onToggleEdit: () => void;
  canPersist: boolean;
  capabilities: CapabilitiesPayload;
  onFloorplanUploaded: () => void;
  onAddRect: () => void;
  onAddPolygon: () => void;
  onDeleteSelected: () => void;
  onRoomColorDraft: (roomId: string, color: string) => void;
  onSaveRoomColor: (roomId: string, color: string) => void;
  roomColorSaving: boolean;
  onRoomNameDraft: (roomId: string, name: string) => void;
  onSaveRoomName: (roomId: string, name: string) => void;
  roomNameSaving: boolean;
};

function LocalPersistHint({
  capabilities,
}: {
  capabilities: CapabilitiesPayload;
}) {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.07] p-2 text-[10px] leading-snug text-amber-100/85">
      <p className="font-semibold text-amber-200/95">
        Can’t add, delete, or upload yet
      </p>
      {isDev && (
        <p className="mt-2 text-[10px] leading-snug text-amber-50/95">
          <span className="font-medium text-amber-200/95">Local dev:</span> add /
          delete / upload use server APIs that need{" "}
          <code className="text-amber-200/95">SUPABASE_SERVICE_ROLE_KEY</code> in{" "}
          <code className="text-amber-200/95">.env.local</code> — the{" "}
          <em>anon</em> key alone is not enough. You can still{" "}
          <strong>drag zones, resize handles, and move labels</strong> on the
          plan; use <span className="text-slate-300">Save to Supabase</span> once
          env is set.
        </p>
      )}
      <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-amber-100/75">
        {!capabilities.hasSupabaseUrl && (
          <li>
            {isDev ? (
              <>
                Create <code className="text-amber-200/95">.env.local</code> next
                to <code className="text-amber-200/95">package.json</code> (copy{" "}
                <code className="text-amber-200/95">.env.example</code>) and set{" "}
                <code className="text-amber-200/95">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>
                . Restart <code className="text-amber-200/95">npm run dev</code>.
              </>
            ) : (
              <>
                Set{" "}
                <code className="text-amber-200/95">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                on your production host’s env config, then redeploy.
              </>
            )}
          </li>
        )}
        {!capabilities.hasServiceRoleKey && (
          <li>
            {isDev ? (
              <>
                In <code className="text-amber-200/95">.env.local</code>, set{" "}
                <code className="text-amber-200/95">
                  SUPABASE_SERVICE_ROLE_KEY
                </code>{" "}
                to the <em>service_role</em> secret (Supabase → Project Settings
                → API). Restart <code className="text-amber-200/95">npm run dev</code>.
              </>
            ) : (
              <>
                Set{" "}
                <code className="text-amber-200/95">
                  SUPABASE_SERVICE_ROLE_KEY
                </code>{" "}
                — Supabase → Project Settings → API → copy{" "}
                <em>service_role</em> (secret). Redeploy after saving.
              </>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}

function hexForColorInput(c: string): string {
  const t = c.trim();
  return /^#[0-9A-Fa-f]{6}$/i.test(t) ? t : "#64748b";
}

function LayoutLiveReadout({
  room,
  canPersist,
  onNameDraft,
  onSaveRoomName,
  roomNameSaving,
  onColorDraft,
  onSaveRoomColor,
  roomColorSaving,
}: {
  room: Room;
  canPersist: boolean;
  onNameDraft: (name: string) => void;
  onSaveRoomName: () => void;
  roomNameSaving: boolean;
  onColorDraft: (hex: string) => void;
  onSaveRoomColor: () => void;
  roomColorSaving: boolean;
}) {
  return (
    <div className="grid max-h-[32vh] gap-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-400 lg:max-h-[min(280px,35vh)] lg:grid-cols-1 lg:border-t lg:border-white/10 lg:pt-3">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Room
        </p>
        <div className="space-y-1.5">
          <label className="block text-[9px] uppercase tracking-wide text-slate-500">
            Label on plan
          </label>
          <input
            type="text"
            value={room.name}
            onChange={(e) => onNameDraft(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:ring-1 focus:ring-sky-500/40"
            style={{ fontFamily: "inherit" }}
            autoComplete="off"
            placeholder="Name shown on the floor plan"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={
                !canPersist || roomNameSaving || !room.name.trim()
              }
              onClick={() => void onSaveRoomName()}
              className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {roomNameSaving ? "Saving…" : "Save label"}
            </button>
            <span className="max-w-[14rem] text-[9px] leading-snug text-slate-600">
              Drag the label on the plan to move it.{" "}
              <span className="text-slate-500">Save layout</span> stores
              position.
            </span>
          </div>
        </div>
        <p>
          <span className="text-slate-500">status · </span>
          {ROOM_STATUS_LABELS[room.status]}
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500">color · </span>
          <span
            className="inline-block h-3 w-3 rounded border border-white/20"
            style={{ backgroundColor: room.color }}
            title={room.color}
          />
          <span>{room.color}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-500">
            <span className="shrink-0">Picker</span>
            <input
              type="color"
              value={hexForColorInput(room.color)}
              onChange={(e) => onColorDraft(e.target.value)}
              className="h-7 w-14 cursor-pointer rounded border border-white/20 bg-transparent p-0"
              title="Updates the block preview; save to write to the database"
            />
          </label>
          <button
            type="button"
            disabled={!canPersist || roomColorSaving}
            onClick={() => void onSaveRoomColor()}
            className="rounded-md border border-sky-500/35 bg-sky-500/10 px-2 py-1 text-[10px] font-medium text-sky-100 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {roomColorSaving ? "Saving…" : "Save colour"}
          </button>
        </div>
        {!canPersist && (
          <p className="text-[9px] leading-snug text-slate-600">
            Typing and the colour picker update the preview. Saving needs the
            service role key on the server.
          </p>
        )}
        <p>
          <span className="text-slate-500">shape · </span>
          {room.shape_type}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Coordinates (live)
        </p>
        <p>
          <span className="text-slate-500">label · </span>
          x{room.label_x.toFixed(2)} y{room.label_y.toFixed(2)}
        </p>
        {room.shape_type === "rect" ? (
          <p>
            <span className="text-slate-500">rect · </span>
            x{(room.rect_x ?? 0).toFixed(2)} y{(room.rect_y ?? 0).toFixed(2)} w
            {(room.rect_width ?? 0).toFixed(2)} h
            {(room.rect_height ?? 0).toFixed(2)}
          </p>
        ) : (
          <p className="break-all" title={room.polygon_points ?? ""}>
            <span className="text-slate-500">polygon · </span>
            {room.polygon_points ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}

export function FloorPlanEditor({
  editMode,
  selectedRoom,
  draftRooms,
  saving,
  shapeBusy,
  onSaveLayout,
  onToggleEdit,
  canPersist,
  capabilities,
  onFloorplanUploaded,
  onAddRect,
  onAddPolygon,
  onDeleteSelected,
  onRoomColorDraft,
  onSaveRoomColor,
  roomColorSaving,
  onRoomNameDraft,
  onSaveRoomName,
  roomNameSaving,
}: Props) {
  const r = selectedRoom
    ? draftRooms.find((x) => x.id === selectedRoom.id) ?? selectedRoom
    : null;

  return (
    <div
      className="fixed z-[100] flex flex-col gap-3 overflow-y-auto border border-amber-500/20 bg-[#0b1018]/98 px-3 py-3 text-xs text-slate-300 shadow-2xl shadow-black/50 backdrop-blur-md
        max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:max-h-[min(52vh,420px)] max-lg:rounded-b-none max-lg:rounded-t-2xl max-lg:border-b-0
        lg:left-3 lg:top-[5rem] lg:max-h-[calc(100vh-5.5rem)] lg:w-[min(360px,calc(32vw))] lg:rounded-2xl"
      role="complementary"
      aria-label="Layout editor"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold uppercase tracking-wider text-amber-200/90">
          Layout edit
        </span>
        <button
          type="button"
          onClick={onToggleEdit}
          className="rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 font-medium text-slate-100 hover:bg-white/[0.1]"
        >
          {editMode ? "Exit edit" : "Edit layout"}
        </button>
        {editMode && (
          <button
            type="button"
            disabled={!canPersist || saving}
            onClick={onSaveLayout}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save to Supabase"}
          </button>
        )}
        {!canPersist && editMode && (
          <span className="text-[11px] text-slate-500">
            Set Supabase env + service role to persist.
          </span>
        )}
      </div>
      {editMode && (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Zones
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canPersist || shapeBusy || saving}
              onClick={onAddRect}
              className="rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-white/[0.1] disabled:opacity-40"
            >
              + Rectangle
            </button>
            <button
              type="button"
              disabled={!canPersist || shapeBusy || saving}
              onClick={onAddPolygon}
              className="rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-white/[0.1] disabled:opacity-40"
            >
              + Polygon
            </button>
            <button
              type="button"
              disabled={
                !canPersist ||
                shapeBusy ||
                saving ||
                !selectedRoom ||
                draftRooms.length === 0
              }
              onClick={onDeleteSelected}
              className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-100 hover:bg-rose-500/20 disabled:opacity-40"
            >
              Delete selected
            </button>
          </div>
          {!canPersist && (
            <LocalPersistHint capabilities={capabilities} />
          )}
        </div>
      )}
      {editMode && (
        <p className="text-[10px] leading-relaxed text-slate-500">
          <span className="font-medium text-slate-400">Guide lines:</span> faint
          strokes on the default SVG are approximate walls—swap with{" "}
          <span className="text-slate-400">Upload base floor plan</span> if you
          like.{" "}
          <span className="font-medium text-slate-400">Polygons:</span> drag
          <span className="text-slate-400"> corners</span> to reshape, or the
          fill to move the whole zone.{" "}
          <span className="text-slate-400">Save layout</span> for positions and
          label text; use <span className="text-slate-400">Save label</span> to
          write the name only.           <span className="text-slate-400">Zones</span>{" "}
          above add/remove shapes (needs DB + service role). Without that, drag
          handles on the plan to reshape/move only in memory until you can save.
        </p>
      )}
      {editMode && (
        <FloorplanBaseUpload
          disabled={!canPersist}
          onUploaded={onFloorplanUploaded}
        />
      )}
      {editMode && r && (
        <LayoutLiveReadout
          room={r}
          canPersist={canPersist}
          onNameDraft={(name) => onRoomNameDraft(r.id, name)}
          onSaveRoomName={() => onSaveRoomName(r.id, r.name)}
          roomNameSaving={roomNameSaving}
          onColorDraft={(hex) => onRoomColorDraft(r.id, hex)}
          onSaveRoomColor={() => onSaveRoomColor(r.id, r.color)}
          roomColorSaving={roomColorSaving}
        />
      )}
    </div>
  );
}
