"use client";

import { useEffect, useState } from "react";
import type { Room, RoomStatus } from "@/lib/types";

type Props = {
  room: Room | null;
  visible: boolean;
  onSaved: () => void;
  canPersist: boolean;
};

export function RoomEditorForm({ room, visible, onSaved, canPersist }: Props) {
  const [status, setStatus] = useState<RoomStatus>("pending");
  const [color, setColor] = useState("#64748b");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!room) return;
    setStatus(room.status);
    setColor(room.color);
    setName(room.name);
  }, [room]);

  if (!visible || !room) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!room) return;
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{ id: room.id, status, color, name }],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      setMsg("Saved.");
      onSaved();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs"
    >
      <p className="mb-2 font-semibold uppercase tracking-wider text-slate-500">
        Room fields (admin-ready)
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-slate-500">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-slate-100"
          />
        </label>
        <label className="text-slate-500">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RoomStatus)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </label>
        <label className="text-slate-500">
          Colour
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
          />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={!canPersist || busy}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save room"}
        </button>
        {msg && <span className="text-slate-400">{msg}</span>}
      </div>
    </form>
  );
}
