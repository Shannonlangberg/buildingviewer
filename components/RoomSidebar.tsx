"use client";

import { cn } from "@/lib/utils";
import type { Room } from "@/lib/types";

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

type Props = {
  rooms: Room[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function RoomSidebar({ rooms, selectedId, onSelect }: Props) {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/[0.12] bg-black/50 shadow-2xl shadow-black/50 backdrop-blur-xl backdrop-saturate-150">
      <h2 className="shrink-0 px-4 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
        Rooms
      </h2>
      <p className="shrink-0 px-4 pb-3 text-[11px] text-gray-600">
        Select a room to view its gallery.
      </p>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-3">
        {rooms.map((room) => {
          const active = room.id === selectedId;
          const category = CATEGORY[room.slug] ?? "Zone";
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition duration-150",
                active
                  ? "border border-orange-500/30 bg-orange-500/[0.12] shadow-sm shadow-black/30 ring-1 ring-orange-500/20"
                  : "border border-transparent hover:bg-white/[0.05]"
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/10"
                style={{ backgroundColor: room.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "truncate text-[13px] font-semibold leading-snug",
                    active ? "text-white" : "text-gray-200"
                  )}
                >
                  {room.name}
                </div>
                <div className="text-[11px] leading-tight text-gray-500">
                  {category}
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
