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
import {
  GalleryPresentationModal,
  type PresentationSlide,
} from "./GalleryPresentationModal";
import { ImageUploader } from "./ImageUploader";
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
  const [presentGallery, setPresentGallery] = useState(true);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [heroCaptionDraft, setHeroCaptionDraft] = useState("");
  const [heroCaptionSaving, setHeroCaptionSaving] = useState(false);

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

  useEffect(() => {
    setHeroCaptionDraft(hero?.caption ?? "");
  }, [hero?.id, hero?.caption]);

  const editGalleryMode = canPersist && !presentGallery;
  const sleekGallery = !canPersist || presentGallery;

  const presentationSlides: PresentationSlide[] = useMemo(() => {
    return images
      .filter((i) => isRasterPreview(i.storage_path))
      .map((i) => {
        const url = publicStorageUrl(i.storage_path);
        if (!url) return null;
        return {
          id: i.id,
          src: url,
          alt: i.caption ?? room?.name ?? "Room image",
          caption: i.caption,
          uploadedAt: i.uploaded_at,
          uploaderName: i.uploader_name,
        } satisfies PresentationSlide;
      })
      .filter(Boolean) as PresentationSlide[];
  }, [images, room?.name]);

  const openPresentationFor = (img: RoomImage) => {
    if (!isRasterPreview(img.storage_path)) return;
    const idx = presentationSlides.findIndex((s) => s.id === img.id);
    if (idx >= 0) {
      setPresentationIndex(idx);
      setPresentationOpen(true);
    }
  };

  const deleteRoomImage = async (imageId: string): Promise<boolean> => {
    if (!canPersist) return false;
    if (
      !confirm(
        "Remove this file from the gallery? It will be deleted from storage."
      )
    ) {
      return false;
    }
    setDeletingImageId(imageId);
    try {
      const res = await fetch(`/api/images/${imageId}`, { method: "DELETE" });
      if (!res.ok) return false;
      await load();
      return true;
    } finally {
      setDeletingImageId(null);
    }
  };

  const updateImageCaption = useCallback(
    async (imageId: string, caption: string): Promise<boolean> => {
      if (!canPersist) return false;
      try {
        const res = await fetch(`/api/images/${imageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: caption.trim() || null }),
        });
        if (!res.ok) return false;
        await load();
        return true;
      } catch {
        return false;
      }
    },
    [canPersist, load]
  );

  useEffect(() => {
    if (!presentationOpen) return;
    if (presentationSlides.length === 0) {
      setPresentationOpen(false);
      setPresentationIndex(0);
      return;
    }
    if (presentationIndex >= presentationSlides.length) {
      setPresentationIndex(presentationSlides.length - 1);
    }
  }, [
    presentationOpen,
    presentationSlides.length,
    presentationIndex,
  ]);

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
      <section className="flex min-h-[240px] flex-col justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] p-8 text-center shadow-xl shadow-black/20 ring-1 ring-white/[0.05] backdrop-blur-xl">
        <p className="text-sm leading-relaxed text-slate-500">
          Choose a room to view its gallery.
        </p>
      </section>
    );
  }

  const heroUrl = hero ? publicStorageUrl(hero.storage_path) : null;
  const heroMime = hero ? guessMimeFromPath(hero.storage_path) : "";

  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-2xl p-5 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto",
        sleekGallery
          ? "border border-white/[0.14] bg-white/[0.06] shadow-[0_12px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/[0.08]"
          : "border border-white/[0.09] bg-white/[0.04] shadow-lg shadow-black/20 ring-1 ring-white/[0.05] backdrop-blur-xl"
      )}
    >
      <header
        className={cn(
          "flex flex-wrap items-start justify-between gap-2 pb-3",
          sleekGallery
            ? "border-b border-white/15"
            : "border-b border-white/[0.06]"
        )}
      >
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
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
        {canPersist && (
          <div
            className={cn(
              "flex shrink-0 rounded-full p-0.5 ring-1",
              presentGallery
                ? "bg-white/[0.08] ring-white/[0.12] backdrop-blur-md"
                : "bg-black/40 ring-white/[0.08]"
            )}
            role="group"
            aria-label="Gallery view mode"
          >
            <button
              type="button"
              onClick={() => setPresentGallery(true)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold transition duration-200",
                presentGallery
                  ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Present
            </button>
            <button
              type="button"
              onClick={() => setPresentGallery(false)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold transition duration-200",
                !presentGallery
                  ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Edit gallery
            </button>
          </div>
        )}
      </header>

      {!sleekGallery && (
        <>
          <ImageUploader
            roomId={room.id}
            disabled={!canPersist}
            onUploaded={() => void load()}
          />
          {!canPersist && (
            <p className="text-[11px] text-slate-500">
              Uploads and reordering need Supabase: set{" "}
              <code className="text-slate-400">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              on the server and run <code className="text-slate-400">schema.sql</code>.
            </p>
          )}
        </>
      )}

      <div className="space-y-2">
        <h3
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            sleekGallery ? "text-slate-400" : "text-slate-500"
          )}
        >
          Hero preview
        </h3>
        <div
          className={cn(
            "relative aspect-video w-full overflow-hidden",
            sleekGallery
              ? "rounded-2xl border border-white/15 bg-white/[0.04] shadow-inner ring-1 ring-white/10 backdrop-blur-md"
              : "rounded-xl border border-white/[0.08] bg-black/40"
          )}
        >
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
              <button
                type="button"
                onClick={() => openPresentationFor(hero)}
                className="absolute inset-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e14]"
                aria-label="Open image in presentation view"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroUrl}
                  alt={hero.caption ?? room.name}
                  className="pointer-events-none m-auto max-h-full max-w-full object-contain"
                />
              </button>
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
          <div className="space-y-3">
            <dl className="grid gap-1 text-xs text-slate-400">
              {(sleekGallery || !canPersist) && (
                <div>
                  <dt className="inline text-slate-500">Label: </dt>
                  <dd className="inline text-slate-300">
                    {hero.caption?.trim() ? hero.caption : "—"}
                  </dd>
                </div>
              )}
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
            {canPersist && !sleekGallery && (
              <div className="border-t border-white/[0.06] pt-3">
                <label
                  htmlFor={`hero-label-${hero.id}`}
                  className="text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  Label
                </label>
                <textarea
                  id={`hero-label-${hero.id}`}
                  value={heroCaptionDraft}
                  onChange={(e) => setHeroCaptionDraft(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Short description shown in the gallery…"
                  className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      heroCaptionSaving ||
                      heroCaptionDraft === (hero.caption ?? "")
                    }
                    onClick={() => {
                      void (async () => {
                        setHeroCaptionSaving(true);
                        try {
                          await updateImageCaption(hero.id, heroCaptionDraft);
                        } finally {
                          setHeroCaptionSaving(false);
                        }
                      })();
                    }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      heroCaptionSaving ||
                        heroCaptionDraft === (hero.caption ?? "")
                        ? "cursor-not-allowed bg-white/5 text-slate-500"
                        : "bg-sky-600/90 text-white hover:bg-sky-500"
                    )}
                  >
                    {heroCaptionSaving ? "Saving…" : "Save label"}
                  </button>
                  <span className="text-[10px] text-slate-600">
                    {heroCaptionDraft.length}/2000
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3
          className={cn(
            "mb-2 text-xs font-semibold uppercase tracking-wider",
            sleekGallery ? "text-slate-400" : "text-slate-500"
          )}
        >
          {sleekGallery ? `${room.name} Gallery` : "Gallery · drag to reorder"}
        </h3>
        {images.length === 0 && !loading ? (
          <p className="text-sm text-slate-500">No uploads yet.</p>
        ) : editGalleryMode ? (
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
                              if (raster) openPresentationFor(img);
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
          <ul
            className={cn(
              sleekGallery
                ? "grid max-h-[min(44vh,380px)] grid-cols-2 gap-3 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-gutter:stable]"
                : "grid grid-cols-3 gap-2 sm:grid-cols-4"
            )}
          >
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
                      if (raster) openPresentationFor(img);
                    }}
                    className={cn(
                      "relative block w-full overflow-hidden",
                      sleekGallery
                        ? "aspect-[4/3] rounded-xl border border-white/15 bg-white/[0.05] shadow-sm ring-1 ring-white/10 backdrop-blur-sm transition hover:border-white/25 hover:bg-white/[0.08]"
                        : "aspect-square rounded-lg border border-white/10 bg-black/30 hover:border-white/20",
                      active
                        ? "border-sky-400/60 ring-1 ring-sky-400/30"
                        : ""
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

      <GalleryPresentationModal
        open={presentationOpen}
        index={presentationIndex}
        slides={presentationSlides}
        onClose={() => setPresentationOpen(false)}
        onIndexChange={setPresentationIndex}
        canManage={canPersist && !presentGallery}
        deletingImageId={deletingImageId}
        onDeleteCurrent={async () => {
          const s = presentationSlides[presentationIndex];
          if (!s) return;
          await deleteRoomImage(s.id);
        }}
        onSaveCaption={
          canPersist && !presentGallery
            ? async (caption) => {
                const s = presentationSlides[presentationIndex];
                if (!s) return false;
                return updateImageCaption(s.id, caption);
              }
            : undefined
        }
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
