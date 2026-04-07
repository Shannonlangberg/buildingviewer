"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUploadDate } from "@/lib/utils";
import {
  guessMimeFromPath,
  isRasterPreview,
  publicStorageUrl,
} from "@/lib/public-url";
import type { Room, RoomImage } from "@/lib/types";
import { ROOM_STATUS_LABELS } from "@/lib/types";
import { ImageUploader } from "./ImageUploader";
import { LightboxViewer, type LightSlide } from "./LightboxViewer";
import { RoomEditorForm } from "./RoomEditorForm";
import { cn } from "@/lib/utils";

function statusPill(status: Room["status"]) {
  const map = {
    pending: "bg-amber-500/15 text-amber-200/90 ring-amber-500/25",
    in_progress: "bg-sky-500/15 text-sky-200/90 ring-sky-500/25",
    confirmed: "bg-emerald-500/15 text-emerald-200/90 ring-emerald-500/25",
  } as const;
  return map[status];
}

function SortableThumb({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative touch-none rounded-lg ring-2 ring-transparent",
        isDragging && "z-10 opacity-90 ring-sky-400/50"
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

type Props = {
  room: Room | null;
  editMode: boolean;
  onRoomsRefresh: () => void;
  canPersist: boolean;
  /** While layout editing, push name/status/colour into draft rooms so the map preview updates. */
  onDraftRoomPatch?: (id: string, patch: Partial<Room>) => void;
};

export function RoomDetailPanel({
  room,
  editMode,
  onRoomsRefresh,
  canPersist,
  onDraftRoomPatch,
}: Props) {
  const [images, setImages] = useState<RoomImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [heroId, setHeroId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const load = useCallback(async () => {
    if (!room) {
      setImages([]);
      setHeroId(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/images?roomId=${room.id}`);
      const data = await res.json();
      const list = (data.images ?? []) as RoomImage[];
      setImages(list);
      setHeroId(list[0]?.id ?? null);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [room]);

  useEffect(() => {
    void load();
  }, [load]);

  const hero = images.find((i) => i.id === heroId) ?? images[0];

  const rasterSlides: LightSlide[] = useMemo(() => {
    return images
      .filter((i) => isRasterPreview(i.storage_path))
      .map((i) => {
        const url = publicStorageUrl(i.storage_path);
        return url ? { src: url, alt: i.caption ?? "" } : null;
      })
      .filter(Boolean) as LightSlide[];
  }, [images]);

  const openLightboxFor = (img: RoomImage) => {
    const url = publicStorageUrl(img.storage_path);
    if (!url || !isRasterPreview(img.storage_path)) return;
    const idx = rasterSlides.findIndex((s) => s.src === url);
    if (idx >= 0) {
      setLightboxIndex(idx);
      setLightboxOpen(true);
    }
  };

  const deleteRoomImage = async (imageId: string) => {
    if (!canPersist) return;
    if (
      !confirm(
        "Remove this file from the gallery? It will be deleted from storage."
      )
    ) {
      return;
    }
    setDeletingImageId(imageId);
    try {
      const res = await fetch(`/api/images/${imageId}`, { method: "DELETE" });
      if (!res.ok) return;
      await load();
    } finally {
      setDeletingImageId(null);
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((i) => i.id === active.id);
    const newIndex = images.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(images, oldIndex, newIndex).map((img, i) => ({
      ...img,
      sort_order: i + 1,
    }));
    setImages(next);
    try {
      await fetch("/api/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: next.map((i) => ({ id: i.id, sort_order: i.sort_order })),
        }),
      });
    } catch {
      void load();
    }
  };

  if (!room) {
    return (
      <section className="flex min-h-[240px] flex-col justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center backdrop-blur-md">
        <p className="text-sm text-slate-400">Choose a room to view its gallery.</p>
      </section>
    );
  }

  const heroUrl = hero ? publicStorageUrl(hero.storage_path) : null;
  const heroMime = hero ? guessMimeFromPath(hero.storage_path) : "";

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            {room.name}
          </h2>
          <span
            className={cn(
              "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
              statusPill(room.status)
            )}
          >
            {ROOM_STATUS_LABELS[room.status]}
          </span>
        </div>
      </header>

      <ImageUploader
        roomId={room.id}
        disabled={!canPersist}
        onUploaded={() => void load()}
      />
      {!canPersist && (
        <p className="text-[11px] text-slate-500">
          Uploads and reordering need Supabase: set{" "}
          <code className="text-slate-400">SUPABASE_SERVICE_ROLE_KEY</code> on
          the server and run <code className="text-slate-400">schema.sql</code>.
        </p>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Hero preview
        </h3>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/[0.08] bg-black/40">
          {loading && (
            <div className="absolute inset-0 animate-pulse bg-white/5" />
          )}
          {!loading && !hero && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No files yet for this room.
            </div>
          )}
          {!loading &&
            hero &&
            heroUrl &&
            isRasterPreview(hero.storage_path) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroUrl}
                alt={hero.caption ?? room.name}
                className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
              />
            )}
          {!loading && hero && heroMime === "application/pdf" && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
              <p className="text-sm text-slate-300">PDF document</p>
              <a
                href={heroUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-sky-300 hover:underline"
              >
                Open in new tab
              </a>
            </div>
          )}
          {!loading &&
            hero &&
            (heroMime === "image/heic" || heroMime === "image/heif") && (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-400">
                HEIC preview not shown in-browser. Download from storage after
                upload.
              </div>
            )}
        </div>
        {hero && (
          <dl className="grid gap-1 text-xs text-slate-400">
            <div>
              <dt className="inline text-slate-500">Caption: </dt>
              <dd className="inline text-slate-300">
                {hero.caption?.trim() ? hero.caption : "—"}
              </dd>
            </div>
            <div>
              <dt className="inline text-slate-500">Uploaded: </dt>
              <dd className="inline">{formatUploadDate(hero.uploaded_at)}</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">By: </dt>
              <dd className="inline">
                {hero.uploader_name?.trim() ? hero.uploader_name : "—"}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Gallery · drag to reorder
        </h3>
        {images.length === 0 && !loading ? (
          <p className="text-sm text-slate-500">No uploads yet.</p>
        ) : canPersist ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={images.map((i) => i.id)}
              strategy={rectSortingStrategy}
            >
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img) => {
                  const url = publicStorageUrl(img.storage_path);
                  const raster = isRasterPreview(img.storage_path);
                  const pdf =
                    guessMimeFromPath(img.storage_path) === "application/pdf";
                  const active = img.id === heroId;
                  const deleting = deletingImageId === img.id;
                  return (
                    <li key={img.id}>
                      <SortableThumb id={img.id}>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setHeroId(img.id);
                              if (raster) openLightboxFor(img);
                            }}
                            className={cn(
                              "relative block aspect-square w-full overflow-hidden rounded-lg border border-white/10 bg-black/30",
                              active
                                ? "border-sky-400/60 ring-1 ring-sky-400/30"
                                : "border-white/10 hover:border-white/20"
                            )}
                          >
                            {raster && url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={url}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                            )}
                            {pdf && (
                              <span className="flex h-full items-center justify-center text-[10px] font-medium text-slate-300">
                                PDF
                              </span>
                            )}
                            {!raster && !pdf && (
                              <span className="flex h-full items-center justify-center text-[10px] text-slate-400">
                                FILE
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            title="Remove from gallery"
                            disabled={deleting}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void deleteRoomImage(img.id);
                            }}
                            className="absolute right-1 top-1 z-[2] rounded bg-rose-950/90 px-1.5 py-0.5 text-[9px] font-semibold text-rose-100 shadow-md ring-1 ring-rose-500/30 hover:bg-rose-900 disabled:opacity-50"
                          >
                            {deleting ? "…" : "✕"}
                          </button>
                        </div>
                      </SortableThumb>
                    </li>
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((img) => {
              const url = publicStorageUrl(img.storage_path);
              const raster = isRasterPreview(img.storage_path);
              const pdf =
                guessMimeFromPath(img.storage_path) === "application/pdf";
              const active = img.id === heroId;
              return (
                <li key={img.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setHeroId(img.id);
                      if (raster) openLightboxFor(img);
                    }}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-lg border border-white/10 bg-black/30",
                      active
                        ? "border-sky-400/60 ring-1 ring-sky-400/30"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {raster && url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    {pdf && (
                      <span className="flex h-full items-center justify-center text-[10px] font-medium text-slate-300">
                        PDF
                      </span>
                    )}
                    {!raster && !pdf && (
                      <span className="flex h-full items-center justify-center text-[10px] text-slate-400">
                        FILE
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <LightboxViewer
        open={lightboxOpen}
        index={lightboxIndex}
        slides={rasterSlides}
        onClose={() => setLightboxOpen(false)}
      />

      <RoomEditorForm
        room={room}
        visible={editMode}
        onSaved={onRoomsRefresh}
        canPersist={canPersist}
        onDraftChange={
          room && onDraftRoomPatch
            ? (patch) => onDraftRoomPatch(room.id, patch)
            : undefined
        }
      />
    </section>
  );
}
