"use client";

import type { CSSProperties } from "react";
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

const navStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  overflowY: "auto",
  paddingRight: 4,
};

function roomButtonStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 10,
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
    color: "inherit",
    border: active
      ? "1px solid rgba(249, 115, 22, 0.35)"
      : "1px solid transparent",
    background: active
      ? "rgba(249, 115, 22, 0.14)"
      : "transparent",
  };
}

const STATUS_COLORS: Record<Room["status"], string> = {
  pending: "text-amber-300/80",
  in_progress: "text-sky-300/80",
  confirmed: "text-teal-300/80",
};

type Props = {
  rooms: Room[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function RoomSidebar({ rooms, selectedId, onSelect }: Props) {
  return (
    <aside
      className="flex flex-col gap-2 rounded-2xl border border-white/[0.12] bg-black/50 px-3 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl backdrop-saturate-150 lg:min-h-0 lg:max-h-[calc(100vh-5rem)]"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        padding: "12px",
        boxSizing: "border-box",
      }}
    >
      <h2 className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
        Rooms
      </h2>
      <nav
        className="flex flex-col gap-0.5 overflow-y-auto pr-0.5 lg:max-h-[calc(100vh-7rem)]"
        style={navStyle}
      >
        {rooms.map((room) => {
          const active = room.id === selectedId;
          const category = CATEGORY[room.slug] ?? "Zone";
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room.id)}
              style={roomButtonStyle(active)}
              className={cn(
                "transition duration-150",
                active
                  ? "shadow-sm shadow-black/30 ring-1 ring-orange-500/20"
                  : "hover:bg-white/[0.05]"
              )}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: room.color }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-gray-100">
                {room.name}
              </span>
              <span className="shrink-0 text-[10px] text-gray-600">
                {category}
              </span>
              <span
                className={cn(
                  "shrink-0 text-[9px] font-semibold",
                  STATUS_COLORS[room.status]
                )}
              >
                {ROOM_STATUS_LABELS[room.status]}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
