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
        className="absolute inset-0 bg-[#030508]/75 backdrop-blur-2xl backdrop-saturate-150"
        onClick={onClose}
        aria-label="Close overlay"
      />
      <div
        className="relative z-[1] flex w-full max-w-5xl flex-col overflow-hidden rounded-[1.35rem] border border-white/[0.14] bg-white/[0.07] shadow-[0_28px_90px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/[0.08]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
          {canManage && onDeleteCurrent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onDeleteCurrent();
              }}
              disabled={deleting}
              className="rounded-full border border-rose-400/25 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold text-rose-100 backdrop-blur-md transition hover:bg-rose-500/25 disabled:opacity-50"
            >
              {deleting ? "Removing…" : "Delete"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg leading-none text-slate-100 backdrop-blur-md transition hover:bg-white/18 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex min-h-0 flex-col pt-12">
          <div className="relative flex min-h-[200px] w-full items-center justify-center px-4 pb-4 sm:min-h-[min(52vh,520px)] sm:px-10 sm:pb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt={slide.alt}
              className="max-h-[min(62vh,720px)] max-w-full rounded-2xl object-contain shadow-[0_12px_48px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
            />
            {hasMany && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-2xl text-white shadow-lg backdrop-blur-md transition hover:bg-white/25 hover:text-white sm:left-5 sm:h-14 sm:w-14"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-white/15 text-2xl text-white shadow-lg backdrop-blur-md transition hover:bg-white/25 hover:text-white sm:right-5 sm:h-14 sm:w-14"
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <footer className="border-t border-white/15 bg-white/[0.06] px-4 py-5 text-left backdrop-blur-xl sm:px-8 sm:py-6">
            {canManage && onSaveCaption ? (
              <div className="space-y-4">
                <div className="space-y-1 text-sm">
                  <p className="text-slate-200">
                    <span className="text-slate-500">Uploaded by </span>
                    {uploader}
                  </p>
                  <p className="text-slate-200">
                    <span className="text-slate-500">Date </span>
                    {formatUploadDate(slide.uploadedAt)}
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Description
                  </p>
                  <textarea
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Add a short description…"
                    className="w-full resize-y rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 backdrop-blur-sm focus:border-sky-400/45 focus:outline-none focus:ring-1 focus:ring-sky-400/30"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
                    <p className="mt-2 text-xs text-rose-400">{captionError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm leading-relaxed text-slate-100">
                <p>
                  <span className="text-slate-500">Uploaded by </span>
                  {uploader}
                </p>
                <p>
                  <span className="text-slate-500">Date </span>
                  {formatUploadDate(slide.uploadedAt)}
                </p>
                <p className="pt-1 text-slate-200">
                  <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Description
                  </span>
                  <span className="mt-1 block">{descriptionReadOnly}</span>
                </p>
              </div>
            )}
            {hasMany && (
              <p className="mt-4 text-center text-[11px] text-slate-400/90">
                {index + 1} of {slides.length}
              </p>
            )}
          </footer>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
