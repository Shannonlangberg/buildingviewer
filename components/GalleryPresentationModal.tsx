"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn, formatUploadDate } from "@/lib/utils";

export type PresentationSlide = {
  id: string;
  src: string;
  alt: string;
  caption: string | null;
  uploadedAt: string;
  uploaderName: string | null;
};

type Props = {
  open: boolean;
  index: number;
  slides: PresentationSlide[];
  onClose: () => void;
  onIndexChange: (i: number) => void;
  /** Allow delete + edit label (caption) */
  canManage?: boolean;
  deletingImageId?: string | null;
  onDeleteCurrent?: () => void | Promise<void>;
  onSaveCaption?: (caption: string) => Promise<boolean>;
};

export function GalleryPresentationModal({
  open,
  index,
  slides,
  onClose,
  onIndexChange,
  canManage = false,
  deletingImageId = null,
  onDeleteCurrent,
  onSaveCaption,
}: Props) {
  const slide = slides[index];
  const hasMany = slides.length > 1;
  const [captionDraft, setCaptionDraft] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const deleting = slide ? deletingImageId === slide.id : false;

  // Sync draft when switching slides or after save; deps use primitives only so
  // parent slide object identity does not reset the field while typing.
  useEffect(() => {
    if (!slide) return;
    setCaptionDraft(slide.caption ?? "");
    setCaptionError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- slide?.id + slide?.caption
  }, [open, slide?.id, slide?.caption]);

  const goPrev = useCallback(() => {
    if (slides.length === 0) return;
    onIndexChange(index <= 0 ? slides.length - 1 : index - 1);
  }, [index, slides.length, onIndexChange]);

  const goNext = useCallback(() => {
    if (slides.length === 0) return;
    onIndexChange(index >= slides.length - 1 ? 0 : index + 1);
  }, [index, slides.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || slides.length === 0) return;
    if (index >= slides.length) {
      onIndexChange(slides.length - 1);
    }
  }, [open, index, slides.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "TEXTAREA" ||
          t.tagName === "INPUT" ||
          t.isContentEditable)
      ) {
        if (e.key === "Escape") onClose();
        return;
      }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, goPrev, goNext]);

  if (typeof document === "undefined") return null;
  if (!open || slides.length === 0 || !slide) return null;

  const uploader = slide.uploaderName?.trim()
    ? slide.uploaderName
    : "Unknown";
  const descriptionReadOnly = slide.caption?.trim()
    ? slide.caption
    : "No description.";

  const saveCaption = async () => {
    if (!onSaveCaption) return;
    setCaptionError(null);
    setSavingCaption(true);
    try {
      const ok = await onSaveCaption(captionDraft);
      if (!ok) setCaptionError("Could not save label.");
    } finally {
      setSavingCaption(false);
    }
  };

  const node = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#070a0f]/92 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close overlay"
      />
      <div className="relative z-[1] flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0a0e14] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="absolute right-3 top-3 z-[2] flex items-center gap-2">
          {canManage && onDeleteCurrent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onDeleteCurrent();
              }}
              disabled={deleting}
              className="rounded-full bg-rose-950/80 px-3 py-1.5 text-[11px] font-semibold text-rose-100 ring-1 ring-rose-500/35 transition hover:bg-rose-900 disabled:opacity-50"
            >
              {deleting ? "Removing…" : "Delete"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-lg leading-none text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="relative flex min-h-[200px] flex-1 items-stretch gap-0 pt-11 sm:min-h-[280px] sm:pt-12">
          {hasMany && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="group flex w-11 shrink-0 items-center justify-center sm:w-14"
              aria-label="Previous image"
            >
              <span className="rounded-full bg-white/[0.06] px-2 py-3 text-xl text-white/80 ring-1 ring-white/10 transition group-hover:bg-white/10 group-hover:text-white sm:px-3 sm:text-2xl">
                ‹
              </span>
            </button>
          )}
          <div className="flex min-w-0 flex-1 items-center justify-center px-1 pb-2 sm:px-2 sm:pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt={slide.alt}
              className="max-h-[min(68vh,720px)] max-w-full rounded-xl object-contain shadow-lg shadow-black/40"
            />
          </div>
          {hasMany && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="group flex w-11 shrink-0 items-center justify-center sm:w-14"
              aria-label="Next image"
            >
              <span className="rounded-full bg-white/[0.06] px-2 py-3 text-xl text-white/80 ring-1 ring-white/10 transition group-hover:bg-white/10 group-hover:text-white sm:px-3 sm:text-2xl">
                ›
              </span>
            </button>
          )}
        </div>

        <footer className="border-t border-white/[0.07] bg-black/25 px-4 py-4 sm:px-6 sm:py-5">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Uploaded by
              </dt>
              <dd className="mt-0.5 text-slate-200">{uploader}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Date
              </dt>
              <dd className="mt-0.5 text-slate-300">
                {formatUploadDate(slide.uploadedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Label
              </dt>
              <dd className="mt-0.5">
                {canManage && onSaveCaption ? (
                  <div className="space-y-2">
                    <textarea
                      value={captionDraft}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Add a short label or description…"
                      className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void saveCaption()}
                        disabled={
                          savingCaption ||
                          captionDraft === (slide.caption ?? "")
                        }
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                          savingCaption ||
                            captionDraft === (slide.caption ?? "")
                            ? "cursor-not-allowed bg-white/5 text-slate-500"
                            : "bg-sky-600/90 text-white hover:bg-sky-500"
                        )}
                      >
                        {savingCaption ? "Saving…" : "Save label"}
                      </button>
                      <span className="text-[10px] text-slate-600">
                        {captionDraft.length}/2000
                      </span>
                    </div>
                    {captionError && (
                      <p className="text-xs text-rose-400">{captionError}</p>
                    )}
                  </div>
                ) : (
                  <p className="leading-relaxed text-slate-300">
                    {descriptionReadOnly}
                  </p>
                )}
              </dd>
            </div>
          </dl>
          {hasMany && (
            <p className="mt-3 text-center text-[11px] text-slate-500">
              {index + 1} / {slides.length}
            </p>
          )}
        </footer>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
