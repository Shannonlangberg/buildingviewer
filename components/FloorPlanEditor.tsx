"use client";

import type { CapabilitiesPayload } from "@/lib/server-capabilities";
import { floorplanHasRemovableBaseUpload } from "@/lib/public-url";
import {
  DEFAULT_LABEL_TEXT_COLOR,
  LABEL_FONT_SIZE_MAX,
  LABEL_FONT_SIZE_MIN,
  effectiveLabelFill,
  effectiveLabelFontSize,
  hexForLabelColorPicker,
} from "@/lib/room-label-style";
import type { BaseImageTransform, Floorplan, Room } from "@/lib/types";
import { ROOM_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
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
  floorplan: Floorplan | null;
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
  onLabelTextColorDraft: (roomId: string, hex: string) => void;
  onLabelFontSizeDraft: (roomId: string, size: number) => void;
  onSaveLabelStyle: (
    roomId: string,
    style: { label_text_color: string; label_font_size: number }
  ) => void;
  labelStyleSaving: boolean;
  baseLayerOpacity: number;
  onBaseLayerOpacityChange: (opacity: number) => void;
  baseImageTransform: BaseImageTransform;
  onBaseImageTransformChange: (t: BaseImageTransform) => void;
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
      {(capabilities.supabaseUrlPresentButInvalid ||
        capabilities.serviceRoleKeyPresentButInvalid) && (
        <p className="mt-2 border-t border-amber-500/20 pt-2 text-[10px] leading-snug text-amber-200/90">
          {capabilities.supabaseUrlPresentButInvalid && (
            <>
              <strong>URL looks wrong:</strong> use the exact{" "}
              <em>Project URL</em> from Supabase (e.g.{" "}
              <code className="text-amber-100/95">https://xxxxx.supabase.co</code>
              ), no quotes or trailing spaces.{" "}
            </>
          )}
          {capabilities.serviceRoleKeyPresentButInvalid && (
            <>
              <strong>Service role key looks wrong:</strong> copy the full{" "}
              <em>service_role</em> JWT (three segments separated by dots)—not
              the anon key, not truncated. Remove wrapping quotes in Railway.{" "}
            </>
          )}
          Then <strong>Redeploy</strong> the Railway service.
        </p>
      )}
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
  onLabelTextColorDraft,
  onLabelFontSizeDraft,
  onSaveLabelStyle,
  labelStyleSaving,
}: {
  room: Room;
  canPersist: boolean;
  onNameDraft: (name: string) => void;
  onSaveRoomName: () => void;
  roomNameSaving: boolean;
  onColorDraft: (hex: string) => void;
  onSaveRoomColor: () => void;
  roomColorSaving: boolean;
  onLabelTextColorDraft: (hex: string) => void;
  onLabelFontSizeDraft: (size: number) => void;
  onSaveLabelStyle: () => void;
  labelStyleSaving: boolean;
}) {
  const labelSize = effectiveLabelFontSize(room);
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
            className="w-full rounded-lg border border-white/15 bg-app-inset px-2 py-1.5 text-[11px] text-gray-100 outline-none focus:ring-1 focus:ring-orange-500/35"
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
            <span className="shrink-0">Zone</span>
            <input
              type="color"
              value={hexForColorInput(room.color)}
              onChange={(e) => onColorDraft(e.target.value)}
              className="h-7 w-14 cursor-pointer rounded border border-white/20 bg-transparent p-0"
              title="Zone fill colour; save to write to the database"
            />
          </label>
          <button
            type="button"
            disabled={!canPersist || roomColorSaving}
            onClick={() => void onSaveRoomColor()}
            className="rounded-md border border-orange-500/35 bg-orange-500/10 px-2 py-1 text-[10px] font-medium text-orange-100 hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {roomColorSaving ? "Saving…" : "Save zone colour"}
          </button>
        </div>
        <div className="space-y-2 border-t border-white/10 pt-2">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Label on plan (text)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-500">
              <span className="shrink-0">Colour</span>
              <input
                type="color"
                value={hexForLabelColorPicker(room)}
                onChange={(e) => onLabelTextColorDraft(e.target.value)}
                className="h-7 w-14 cursor-pointer rounded border border-white/20 bg-transparent p-0"
                title="Text colour for the name on the floor plan"
              />
            </label>
            <input
              type="text"
              value={room.label_text_color ?? ""}
              onChange={(e) => onLabelTextColorDraft(e.target.value)}
              spellCheck={false}
              className="min-w-[6rem] max-w-[10rem] rounded-md border border-white/15 bg-app-inset px-2 py-1 font-mono text-[10px] text-gray-200 outline-none focus:ring-1 focus:ring-orange-500/35"
              title="Any CSS colour, e.g. #fff or rgba(255,255,255,0.9)"
              placeholder={DEFAULT_LABEL_TEXT_COLOR}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500">Size</span>
              <span className="tabular-nums text-[10px] text-slate-400">
                {labelSize.toFixed(1)} px
              </span>
            </div>
            <input
              type="range"
              min={LABEL_FONT_SIZE_MIN}
              max={LABEL_FONT_SIZE_MAX}
              step={0.1}
              value={labelSize}
              onChange={(e) =>
                onLabelFontSizeDraft(Number.parseFloat(e.target.value))
              }
              className={cn(
                "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10",
                "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-400",
                "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-orange-400"
              )}
              aria-label="Label text size on plan"
            />
            <p className="mt-1 text-[9px] leading-snug text-slate-600">
              Scale is SVG units (plan is 0–100 wide).{" "}
              {LABEL_FONT_SIZE_MIN}–{LABEL_FONT_SIZE_MAX} typical.
            </p>
          </div>
          <button
            type="button"
            disabled={!canPersist || labelStyleSaving}
            onClick={() =>
              void onSaveLabelStyle()
            }
            className="rounded-md border border-white/20 bg-app-raised px-2 py-1 text-[10px] font-medium text-gray-100 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {labelStyleSaving ? "Saving…" : "Save label look"}
          </button>
        </div>
        {!canPersist && (
          <p className="text-[9px] leading-snug text-slate-600">
            Pickers update the preview. Saving needs the service role key on
            the server.
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
  floorplan,
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
  onLabelTextColorDraft,
  onLabelFontSizeDraft,
  onSaveLabelStyle,
  labelStyleSaving,
  baseLayerOpacity,
  onBaseLayerOpacityChange,
  baseImageTransform,
  onBaseImageTransformChange,
}: Props) {
  const r = selectedRoom
    ? draftRooms.find((x) => x.id === selectedRoom.id) ?? selectedRoom
    : null;

  const storageBucket =
    process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "room-images";

  return (
    <div
      className="mb-4 w-full rounded-2xl border border-white/[0.12] bg-black/50 p-4 text-xs text-gray-300 shadow-2xl shadow-black/50 backdrop-blur-xl backdrop-saturate-150 sm:p-5"
      role="complementary"
      aria-label="Layout editor"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-orange-500/15 px-2 py-0.5 font-semibold uppercase tracking-wider text-orange-200/95 ring-1 ring-orange-500/25">
          Layout edit
        </span>
        <button
          type="button"
          onClick={onToggleEdit}
          className="rounded-lg border border-white/15 bg-app-inset px-3 py-1.5 font-medium text-gray-100 hover:border-white/25 hover:bg-app-raised"
        >
          {editMode ? "Exit edit" : "Edit layout"}
        </button>
        {editMode && (
          <button
            type="button"
            disabled={!canPersist || saving}
            onClick={onSaveLayout}
            className="rounded-lg border border-emerald-600/40 bg-emerald-900/40 px-3 py-1.5 font-medium text-emerald-100 hover:bg-emerald-800/50 disabled:opacity-40"
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
        <div className="mt-4 grid gap-6 border-t border-white/10 pt-4 lg:grid-cols-[1fr_minmax(260px,380px)]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Zones
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canPersist || shapeBusy || saving}
                  onClick={onAddRect}
                  className="rounded-lg border border-white/15 bg-app-inset px-2.5 py-1.5 text-[11px] font-medium text-gray-100 hover:border-white/25 hover:bg-app-raised disabled:opacity-40"
                >
                  + Rectangle
                </button>
                <button
                  type="button"
                  disabled={!canPersist || shapeBusy || saving}
                  onClick={onAddPolygon}
                  className="rounded-lg border border-white/15 bg-app-inset px-2.5 py-1.5 text-[11px] font-medium text-gray-100 hover:border-white/25 hover:bg-app-raised disabled:opacity-40"
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
            <p className="text-[10px] leading-relaxed text-slate-500">
              <span className="font-medium text-slate-400">Guide lines:</span>{" "}
              faint strokes on the default SVG are approximate walls—swap with{" "}
              <span className="text-slate-400">Upload base floor plan</span> if
              you like.{" "}
              <span className="font-medium text-slate-400">Polygons:</span> drag
              <span className="text-slate-400"> corners</span> to reshape;{" "}
              <span className="text-slate-400">double-click an edge</span> to add
              a corner; <span className="text-slate-400">Alt-click a corner</span>{" "}
              to remove (min 3). Drag the fill to move the whole zone.{" "}
              <span className="text-slate-400">Save layout</span> for positions;
              <span className="text-slate-400"> Save label</span> for the name;{" "}
              <span className="text-slate-400">Save label look</span> for text
              colour and size. <span className="text-slate-400">Zones</span>{" "}
              above add/remove shapes (needs DB + service role). Without that,
              drag handles on the plan to reshape/move only in memory until you
              can save.
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Base plan opacity
                  </p>
                  <span className="tabular-nums text-[11px] font-medium text-slate-400">
                    {Math.round(baseLayerOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(baseLayerOpacity * 100)}
                  onChange={(e) =>
                    onBaseLayerOpacityChange(Number(e.target.value) / 100)
                  }
                  className={cn(
                    "mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10",
                    "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-400 [&::-webkit-slider-thumb]:shadow-md",
                    "[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-gray-400"
                  )}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(baseLayerOpacity * 100)}
                  aria-label="Base floor plan opacity"
                />
                <p className="mt-1.5 text-[10px] leading-snug text-slate-600">
                  Fades the blueprint or uploaded image under room zones. Saved
                  in this browser only.
                </p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Base plan position &amp; size
                </p>
                <div className="mt-2 space-y-2">
                  {([
                    { key: "scale" as const, label: "Scale", min: 0.3, max: 2.5, step: 0.01, fmt: (v: number) => `${Math.round(v * 100)}%` },
                    { key: "offsetX" as const, label: "Shift left/right", min: -40, max: 40, step: 0.5, fmt: (v: number) => v.toFixed(1) },
                    { key: "offsetY" as const, label: "Shift up/down", min: -40, max: 40, step: 0.5, fmt: (v: number) => v.toFixed(1) },
                  ] as const).map(({ key, label, min, max, step, fmt }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-500">{label}</span>
                        <span className="tabular-nums text-[10px] text-slate-400">
                          {fmt(baseImageTransform[key])}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={baseImageTransform[key]}
                        onChange={(e) =>
                          onBaseImageTransformChange({
                            ...baseImageTransform,
                            [key]: Number(e.target.value),
                          })
                        }
                        className={cn(
                          "mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10",
                          "[&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-400 [&::-webkit-slider-thumb]:shadow-md",
                          "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-gray-400"
                        )}
                        aria-label={label}
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onBaseImageTransformChange({ scale: 1, offsetX: 0, offsetY: 0 })
                  }
                  className="mt-2 rounded-md border border-white/15 bg-app-inset px-2 py-1 text-[10px] font-medium text-gray-300 hover:border-white/25 hover:bg-app-raised"
                >
                  Reset position &amp; size
                </button>
                <p className="mt-1.5 text-[10px] leading-snug text-slate-600">
                  Scale and shift the uploaded plan under the room zones. Room zones stay fixed. Saved in this browser.
                </p>
              </div>
              <div className="border-t border-white/10 pt-3">
                <FloorplanBaseUpload
                  disabled={!canPersist}
                  onUploaded={onFloorplanUploaded}
                  canRemoveUploadedBase={floorplanHasRemovableBaseUpload(
                    floorplan?.image_path,
                    storageBucket
                  )}
                  onRemoveUploadedBase={onFloorplanUploaded}
                />
              </div>
            </div>
          </div>
          <div className="min-w-0 border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            {r ? (
              <LayoutLiveReadout
                room={r}
                canPersist={canPersist}
                onNameDraft={(name) => onRoomNameDraft(r.id, name)}
                onSaveRoomName={() => onSaveRoomName(r.id, r.name)}
                roomNameSaving={roomNameSaving}
                onColorDraft={(hex) => onRoomColorDraft(r.id, hex)}
                onSaveRoomColor={() => onSaveRoomColor(r.id, r.color)}
                roomColorSaving={roomColorSaving}
                onLabelTextColorDraft={(hex) =>
                  onLabelTextColorDraft(r.id, hex)
                }
                onLabelFontSizeDraft={(size) =>
                  onLabelFontSizeDraft(r.id, size)
                }
                onSaveLabelStyle={() =>
                  void onSaveLabelStyle(r.id, {
                    label_text_color: effectiveLabelFill(r),
                    label_font_size: effectiveLabelFontSize(r),
                  })
                }
                labelStyleSaving={labelStyleSaving}
              />
            ) : (
              <p className="text-[11px] leading-relaxed text-slate-500">
                Select a space in the sidebar to edit its label, colours, and
                live coordinates.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
