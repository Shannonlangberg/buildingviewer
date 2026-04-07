"use client";

import type { Room } from "@/lib/types";

type Props = {
  editMode: boolean;
  selectedRoom: Room | null;
  draftRooms: Room[];
  saving: boolean;
  onSaveLayout: () => void;
  onToggleEdit: () => void;
  canPersist: boolean;
};

export function FloorPlanEditor({
  editMode,
  selectedRoom,
  draftRooms,
  saving,
  onSaveLayout,
  onToggleEdit,
  canPersist,
}: Props) {
  const r = selectedRoom
    ? draftRooms.find((x) => x.id === selectedRoom.id) ?? selectedRoom
    : null;

  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex max-w-[95vw] -translate-x-1/2 flex-col gap-2 rounded-2xl border border-amber-500/25 bg-[#0b1018]/95 px-4 py-3 text-xs text-slate-300 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold uppercase tracking-wider text-amber-200/90">
          Dev · layout
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
      </div>
      {editMode && r && (
        <div className="font-mono text-[11px] leading-relaxed text-slate-400 sm:border-l sm:border-white/10 sm:pl-4">
          <span className="text-slate-500">Selected · </span>
          {r.shape_type === "rect" ? (
            <>
              rect x{r.rect_x?.toFixed(1)} y{r.rect_y?.toFixed(1)} w
              {r.rect_width?.toFixed(1)} h{r.rect_height?.toFixed(1)}
            </>
          ) : (
            <>polygon · {r.polygon_points?.slice(0, 32)}…</>
          )}
          <br />
          <span className="text-slate-500">label · </span>
          x{r.label_x.toFixed(1)} y{r.label_y.toFixed(1)}
        </div>
      )}
    </div>
  );
}
