"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { svgClientToViewBox } from "@/lib/floorplan-edit";
import {
  DEFAULT_FLOORPLAN_VIEWPORT,
  nextViewportForWheelZoom,
  type FloorplanViewport,
} from "@/lib/floorplan-viewport";
import {
  isRasterPreview,
  publicStorageUrl,
} from "@/lib/public-url";
import { formatUploadDate } from "@/lib/utils";
import type { Floorplan, Room, RoomImage } from "@/lib/types";
import { FloorPlanCanvas } from "./FloorPlanCanvas";
import { FloorPlanRoomLabels } from "./FloorPlanRoomLabels";
import { RoomZoneOverlay } from "./RoomZoneOverlay";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  floorplan: Floorplan | null;
  rooms: Room[];
};

export function PresentationView({
  open,
  onClose,
  floorplan,
  rooms,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState<FloorplanViewport>(
    DEFAULT_FLOORPLAN_VIEWPORT
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [images, setImages] = useState<RoomImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedId) ?? null,
    [rooms, selectedId]
  );

  const loadImages = useCallback(async (roomId: string) => {
    setLoading(true);
    setHeroIdx(0);
    try {
      const res = await fetch(`/api/images?roomId=${roomId}`);
      const data = await res.json();
      setImages((data.images ?? []) as RoomImage[]);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setImages([]);
      return;
    }
    void loadImages(selectedId);
  }, [selectedId, loadImages]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setImages([]);
      setHeroIdx(0);
      setViewport(DEFAULT_FLOORPLAN_VIEWPORT);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedId) {
          setSelectedId(null);
        } else {
          onClose();
        }
      }
      if (selectedId && rasterImages.length > 1) {
        if (e.key === "ArrowLeft")
          setHeroIdx((i) =>
            i <= 0 ? rasterImages.length - 1 : i - 1
          );
        if (e.key === "ArrowRight")
          setHeroIdx((i) =>
            i >= rasterImages.length - 1 ? 0 : i + 1
          );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedId, onClose, images.length]);

  const rasterImages = useMemo(
    () => images.filter((i) => isRasterPreview(i.storage_path)),
    [images]
  );

  const hero = rasterImages[heroIdx] ?? null;
  const heroUrl = hero ? publicStorageUrl(hero.storage_path) : null;

  const handleSelectRoom = (id: string) => {
    if (id === selectedId) {
      setSelectedId(null);
    } else {
      setSelectedId(id);
    }
  };

  const zoomAtScreenCenter = (factor: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const root = svgClientToViewBox(
      svg,
      r.left + r.width / 2,
      r.top + r.height / 2
    );
    setViewport((v) => nextViewportForWheelZoom(v, root, factor));
  };

  const resetView = () => setViewport(DEFAULT_FLOORPLAN_VIEWPORT);

  if (typeof document === "undefined" || !open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[200] flex bg-black/80 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Presentation mode"
    >
      {/* Exit button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md transition hover:bg-white/15"
      >
        <span className="text-lg leading-none">←</span>
        Exit
      </button>

      {/* Title */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2">
        <h2 className="text-sm font-semibold tracking-tight text-white/80">
          Mt Barker Building
        </h2>
      </div>

      {/* Floor plan area */}
      <div
        className={cn(
          "flex flex-1 items-center justify-center p-6 transition-all duration-500",
          selectedId ? "sm:pr-0" : ""
        )}
      >
        <div
          className={cn(
            "relative w-full transition-all duration-500 ease-out",
            selectedId
              ? "max-w-[min(55vw,720px)]"
              : "max-w-[min(85vw,1100px)]"
          )}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/[0.12] bg-black/40 shadow-2xl shadow-black/50 ring-1 ring-white/[0.06]">
            <div className="relative h-full w-full">
              <FloorPlanCanvas
                floorplan={floorplan}
                fallbackImageSrc="/floorplans/mt-barker-base.svg"
                svgRef={svgRef}
                baseLayerOpacity={0.85}
                viewport={viewport}
                onBackdropClick={() => setSelectedId(null)}
              >
                <RoomZoneOverlay
                  rooms={rooms}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  editMode={false}
                  onSelect={handleSelectRoom}
                  onHover={setHoveredId}
                  draggingRoomId={null}
                />
                <FloorPlanRoomLabels
                  rooms={rooms}
                  editMode={false}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                />
              </FloorPlanCanvas>
            </div>

            <div className="pointer-events-auto absolute bottom-3 left-3 z-10 flex flex-col gap-0.5 rounded-xl border border-white/[0.12] bg-black/65 p-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
                aria-label="Zoom in"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-medium text-white/90 transition hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomAtScreenCenter(1.15);
                }}
              >
                +
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-medium text-white/90 transition hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomAtScreenCenter(1 / 1.15);
                }}
              >
                −
              </button>
              <button
                type="button"
                aria-label="Reset zoom"
                className="border-t border-white/10 px-0.5 pt-1 text-[9px] font-medium text-white/55 transition hover:text-white/85"
                onClick={(e) => {
                  e.stopPropagation();
                  resetView();
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Room name chips at bottom of plan */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => handleSelectRoom(room.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-medium transition duration-200",
                  room.id === selectedId
                    ? "border border-orange-500/40 bg-orange-500/15 text-orange-100 shadow-md shadow-orange-500/10"
                    : "border border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: room.color }}
                />
                {room.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery slide-out panel */}
      <div
        className={cn(
          "flex h-full w-[420px] max-w-[40vw] shrink-0 flex-col overflow-hidden border-l border-white/10 bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-500 ease-out",
          selectedId
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 pointer-events-none"
        )}
      >
        {selectedRoom && (
          <>
            {/* Panel header */}
            <div className="flex items-start justify-between border-b border-white/10 px-5 pb-4 pt-5">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {selectedRoom.name}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {rasterImages.length} image{rasterImages.length !== 1 && "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-sm text-white/70 transition hover:bg-white/15 hover:text-white"
                aria-label="Close gallery"
              >
                ×
              </button>
            </div>

            {/* Hero image */}
            <div className="relative mx-5 mt-5 aspect-video overflow-hidden rounded-xl border border-white/10 bg-black/30">
              {loading && (
                <div className="absolute inset-0 animate-pulse bg-white/5" />
              )}
              {!loading && !hero && (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  No images yet.
                </div>
              )}
              {!loading && hero && heroUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroUrl}
                    alt={hero.caption ?? selectedRoom.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {rasterImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setHeroIdx((i) =>
                            i <= 0 ? rasterImages.length - 1 : i - 1
                          )
                        }
                        className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-lg text-white/90 backdrop-blur-sm transition hover:bg-black/70"
                        aria-label="Previous"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHeroIdx((i) =>
                            i >= rasterImages.length - 1 ? 0 : i + 1
                          )
                        }
                        className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-white/20 bg-black/50 text-lg text-white/90 backdrop-blur-sm transition hover:bg-black/70"
                        aria-label="Next"
                      >
                        ›
                      </button>
                      <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/50 px-2.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                        {heroIdx + 1} / {rasterImages.length}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Image metadata */}
            {!loading && hero && (
              <div className="mx-5 mt-3 space-y-1 text-xs">
                <p className="text-gray-300">
                  <span className="text-gray-500">Uploaded by </span>
                  <span className="font-medium">
                    {hero.uploader_name?.trim() || "Unknown"}
                  </span>
                </p>
                <p className="text-gray-400">
                  {formatUploadDate(hero.uploaded_at)}
                </p>
                {hero.caption?.trim() && (
                  <p className="mt-2 text-sm leading-relaxed text-gray-200">
                    {hero.caption}
                  </p>
                )}
              </div>
            )}

            {/* Thumbnail strip */}
            <div className="mt-auto border-t border-white/10 px-5 py-4">
              {rasterImages.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {rasterImages.map((img, i) => {
                    const url = publicStorageUrl(img.storage_path);
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setHeroIdx(i)}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-lg border transition",
                          i === heroIdx
                            ? "border-orange-500/50 ring-1 ring-orange-500/25"
                            : "border-white/10 hover:border-white/25"
                        )}
                      >
                        {url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                !loading && (
                  <p className="text-center text-xs text-gray-600">
                    No images uploaded for this room.
                  </p>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
