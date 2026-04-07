"use client";

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
  onFloorplanUploaded: () => void;
  onAddRect: () => void;
  onAddPolygon: () => void;
  onDeleteSelected: () => void;
};

function LayoutLiveReadout({ room }: { room: Room }) {
  return (
    <div className="grid max-h-[32vh] gap-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-400 lg:max-h-[min(280px,35vh)] lg:grid-cols-1 lg:border-t lg:border-white/10 lg:pt-3">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Room
        </p>
        <p className="text-slate-200">{room.name}</p>
        <p>
          <span className="text-slate-500">status · </span>
          {ROOM_STATUS_LABELS[room.status]}
        </p>
        <p className="flex items-center gap-2">
          <span className="text-slate-500">color · </span>
          <span
            className="inline-block h-3 w-3 rounded border border-white/20"
            style={{ backgroundColor: room.color }}
            title={room.color}
          />
          <span>{room.color}</span>
        </p>
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
  onFloorplanUploaded,
  onAddRect,
  onAddPolygon,
  onDeleteSelected,
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
            <p className="text-[10px] text-slate-500">
              Add/delete need Supabase +{" "}
              <code className="text-slate-400">SUPABASE_SERVICE_ROLE_KEY</code>.
            </p>
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
          <span className="text-slate-400">Save layout</span> for positions; use{" "}
          <span className="text-slate-400">Zones</span> above to add/remove shapes
          (saved in the database immediately).
        </p>
      )}
      {editMode && (
        <FloorplanBaseUpload
          disabled={!canPersist}
          onUploaded={onFloorplanUploaded}
        />
      )}
      {editMode && r && <LayoutLiveReadout room={r} />}
    </div>
  );
}
