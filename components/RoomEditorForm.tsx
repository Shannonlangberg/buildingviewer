"use client";

import { useEffect, useState } from "react";
import type { Room, RoomStatus } from "@/lib/types";

type RoomDraftPatch = Partial<
  Pick<Room, "name" | "status" | "color">
>;

type Props = {
  room: Room | null;
  visible: boolean;
  onSaved: () => void;
  canPersist: boolean;
  /** Sync field edits to parent draft state (floor plan preview while editing layout). */
  onDraftChange?: (patch: RoomDraftPatch) => void;
};

export function RoomEditorForm({
  room,
  visible,
  onSaved,
  canPersist,
  onDraftChange,
}: Props) {
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
      className="mt-4 rounded-xl border border-white/10 bg-app-inset p-3 text-xs"
    >
      <p className="mb-2 font-semibold uppercase tracking-wider text-gray-500">
        Room fields (admin-ready)
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-gray-500">
          Name
          <input
            value={name}
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              onDraftChange?.({ name: v });
            }}
            className="mt-1 w-full rounded-lg border border-white/10 bg-app-bg px-2 py-1.5 text-sm text-gray-100"
          />
        </label>
        <label className="text-gray-500">
          Status
          <select
            value={status}
            onChange={(e) => {
              const v = e.target.value as RoomStatus;
              setStatus(v);
              onDraftChange?.({ status: v });
            }}
            className="mt-1 w-full rounded-lg border border-white/10 bg-app-bg px-2 py-1.5 text-sm text-gray-100"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="confirmed">Confirmed</option>
          </select>
        </label>
        <label className="text-gray-500">
          Colour
          <input
            type="color"
            value={color}
            onChange={(e) => {
              const v = e.target.value;
              setColor(v);
              onDraftChange?.({ color: v });
            }}
            className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
          />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={!canPersist || busy}
          className="rounded-lg border border-white/15 bg-app-raised px-3 py-1.5 text-sm font-medium text-white hover:border-white/25 hover:bg-[#2a2e38] disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save room"}
        </button>
        {msg && <span className="text-gray-400">{msg}</span>}
      </div>
    </form>
  );
}
