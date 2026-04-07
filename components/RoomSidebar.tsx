"use client";

import { cn } from "@/lib/utils";
import type { Room } from "@/lib/types";
import { ROOM_STATUS_LABELS } from "@/lib/types";

const CATEGORY: Record<string, string> = {
  foyer: "Entry",
  cafe: "Hospitality",
  auditorium: "Gathering",
  production: "Technical",
  "parents-room": "Family",
  "kids-opt-1": "Kids",
  "kids-opt-2": "Kids",
  "kids-opt-3": "Kids",
  female: "Amenities",
  male: "Amenities",
  store: "Operations",
  alfresco: "Outdoor",
};

function statusPill(status: Room["status"]) {
  const map = {
    pending: "bg-amber-500/15 text-amber-200/90 ring-amber-500/25",
    in_progress: "bg-sky-500/15 text-sky-200/90 ring-sky-500/25",
    confirmed: "bg-emerald-500/15 text-emerald-200/90 ring-emerald-500/25",
  } as const;
  return map[status];
}

type Props = {
  rooms: Room[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function RoomSidebar({ rooms, selectedId, onSelect }: Props) {
  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md lg:min-h-0 lg:max-h-[calc(100vh-8rem)]">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Spaces
        </h2>
        <p className="mt-1 text-sm text-slate-400">Select a room to inspect media.</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0">
        {rooms.map((room) => {
          const active = room.id === selectedId;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room.id)}
              className={cn(
                "flex min-w-[200px] shrink-0 items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition lg:min-w-0",
                active
                  ? "border-white/20 bg-white/[0.07] ring-1 ring-white/10"
                  : "border-transparent bg-transparent hover:border-white/[0.08] hover:bg-white/[0.04]"
              )}
            >
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10"
                style={{ backgroundColor: room.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-100">{room.name}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {CATEGORY[room.slug] ?? "Zone"}
                </span>
                <span
                  className={cn(
                    "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                    statusPill(room.status)
                  )}
                >
                  {ROOM_STATUS_LABELS[room.status]}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
