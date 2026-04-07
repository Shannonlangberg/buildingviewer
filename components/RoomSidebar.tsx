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

/** Inline fallbacks when utility CSS fails to load (static 404, stale cache). */
const navStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  overflowY: "auto",
  paddingRight: 4,
};

function roomButtonStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 12,
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
    color: "inherit",
    border: active
      ? "1px solid rgba(249, 115, 22, 0.35)"
      : "1px solid rgba(255,255,255,0.06)",
    background: active
      ? "rgba(249, 115, 22, 0.14)"
      : "rgba(255,255,255,0.02)",
  };
}

function statusPillInline(status: Room["status"]): CSSProperties {
  const map = {
    pending: {
      background: "rgba(245, 158, 11, 0.12)",
      color: "rgba(253, 230, 138, 0.95)",
      boxShadow: "inset 0 0 0 1px rgba(245, 158, 11, 0.22)",
    },
    in_progress: {
      background: "rgba(14, 165, 233, 0.12)",
      color: "rgba(186, 230, 253, 0.95)",
      boxShadow: "inset 0 0 0 1px rgba(14, 165, 233, 0.22)",
    },
    confirmed: {
      background: "rgba(20, 184, 166, 0.14)",
      color: "rgba(153, 246, 228, 0.95)",
      boxShadow: "inset 0 0 0 1px rgba(45, 212, 191, 0.28)",
    },
  } as const;
  return {
    marginTop: 8,
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 9999,
    padding: "2px 8px",
    fontSize: 10,
    fontWeight: 600,
    lineHeight: 1.2,
    ...map[status],
  };
}

type Props = {
  rooms: Room[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function RoomSidebar({ rooms, selectedId, onSelect }: Props) {
  return (
    <aside
      className="flex flex-col gap-3 rounded-2xl border border-white/[0.12] bg-black/50 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl backdrop-saturate-150 lg:min-h-0 lg:max-h-[calc(100vh-5rem)]"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          Rooms
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          Select a room to view its gallery.
        </p>
      </div>
      <nav
        className="flex max-h-[min(50vh,24rem)] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-10rem)]"
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
                "transition duration-200",
                active
                  ? "shadow-md shadow-black/30 ring-1 ring-orange-500/25"
                  : "hover:border-white/10 hover:bg-white/[0.04]"
              )}
            >
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/15"
                style={{
                  marginTop: 6,
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  borderRadius: 9999,
                  boxShadow: "0 0 0 2px rgba(255,255,255,0.12)",
                  backgroundColor: room.color,
                }}
                aria-hidden
              />
              <div className="min-w-0 flex-1 text-left" style={{ minWidth: 0, flex: 1 }}>
                <div
                  className="font-semibold leading-snug text-gray-100"
                  style={{ display: "block", fontWeight: 600, color: "#f3f4f6" }}
                >
                  {room.name}
                </div>
                <div
                  className="mt-1 text-xs leading-normal text-gray-500"
                  style={{
                    display: "block",
                    marginTop: 4,
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: "#6b7280",
                  }}
                >
                  {category}
                </div>
                <span style={statusPillInline(room.status)}>
                  {ROOM_STATUS_LABELS[room.status]}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
