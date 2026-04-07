"use client";

import { useCallback, useState } from "react";

type Props = {
  disabled: boolean;
  onUploaded: () => void;
};

export function FloorplanBaseUpload({ disabled, onUploaded }: Props) {
  const [busy, setBusy] = useState(false);
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
        });
        const j = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(j.error ?? "Upload failed");
        onUploaded();
      } catch (er) {
        setErr(er instanceof Error ? er.message : "Failed");
      } finally {
        setBusy(false);
      }
    },
    [disabled, onUploaded]
  );

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={
            disabled || busy
              ? "cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-slate-500 opacity-60"
              : "cursor-pointer rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-100 hover:bg-sky-500/20"
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
