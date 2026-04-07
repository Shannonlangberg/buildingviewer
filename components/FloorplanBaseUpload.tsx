"use client";

import { useCallback, useState } from "react";

type Props = {
  disabled: boolean;
  onUploaded: () => void;
  /** Show when DB points at a Supabase `floorplans/…` upload (not bundled SVG). */
  canRemoveUploadedBase: boolean;
  onRemoveUploadedBase: () => void;
};

export function FloorplanBaseUpload({
  disabled,
  onUploaded,
  canRemoveUploadedBase,
  onRemoveUploadedBase,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || disabled) return;
      setErr(null);
      setBusy(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/floorplans/upload", {
          method: "POST",
          body: fd,
          cache: "no-store",
        });
        const j = (await res.json()) as { error?: string; detail?: string };
        if (!res.ok) {
          const parts = [j.error, j.detail].filter(Boolean);
          throw new Error(parts.length ? parts.join(" — ") : "Upload failed");
        }
        onUploaded();
      } catch (er) {
        setErr(er instanceof Error ? er.message : "Failed");
      } finally {
        setBusy(false);
      }
    },
    [disabled, onUploaded]
  );

  const onRemove = useCallback(async () => {
    if (disabled || removeBusy || !canRemoveUploadedBase) return;
    if (
      !confirm(
        "Remove the uploaded base floor plan? The bundled default SVG will show under zones again."
      )
    ) {
      return;
    }
    setErr(null);
    setRemoveBusy(true);
    try {
      const res = await fetch("/api/floorplans/base", {
        method: "DELETE",
        cache: "no-store",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Remove failed");
      onRemoveUploadedBase();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Failed");
    } finally {
      setRemoveBusy(false);
    }
  }, [
    disabled,
    removeBusy,
    canRemoveUploadedBase,
    onRemoveUploadedBase,
  ]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={
            disabled || busy
              ? "cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-slate-500 opacity-60"
              : "cursor-pointer rounded-lg border border-white/15 bg-app-inset px-3 py-1.5 text-[11px] font-medium text-gray-200 hover:border-orange-500/35 hover:bg-orange-500/10"
          }
          title={
            disabled
              ? "Upload needs Supabase URL and service role on the server"
              : undefined
          }
        >
          {busy ? "Uploading…" : "Upload base floor plan"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.png,.webp,.svg"
            className="sr-only"
            disabled={disabled || busy}
            onChange={onChange}
          />
        </label>
        {canRemoveUploadedBase && (
          <button
            type="button"
            disabled={disabled || removeBusy || busy}
            onClick={() => void onRemove()}
            className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-100 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {removeBusy ? "Removing…" : "Remove uploaded base"}
          </button>
        )}
        <p className="max-w-xl text-[10px] leading-snug text-slate-500">
          Sits <span className="text-slate-400">under</span> coloured room zones.
          Match roughly the same footprint as the 0–100 overlay grid. JPG, PNG,
          WebP, or SVG · max 20MB.
        </p>
      </div>
      {err && <p className="text-[10px] text-rose-300">{err}</p>}
    </div>
  );
}
