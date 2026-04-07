import { MOCK_FLOORPLAN, MOCK_ROOMS } from "./mock-data";
import { createServerAnonSupabase, isSupabaseConfigured } from "./supabase";
import type { Floorplan, Room, RoomImage } from "./types";

export async function getActiveFloorplan(): Promise<Floorplan | null> {
  if (!isSupabaseConfigured()) return MOCK_FLOORPLAN;
  const supabase = createServerAnonSupabase();
  if (!supabase) return MOCK_FLOORPLAN;
  const { data, error } = await supabase
    .from("floorplans")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return MOCK_FLOORPLAN;
  return data as Floorplan;
}

export async function getRooms(): Promise<Room[]> {
  if (!isSupabaseConfigured()) return MOCK_ROOMS;
  const supabase = createServerAnonSupabase();
  if (!supabase) return MOCK_ROOMS;
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error || !data?.length) return MOCK_ROOMS;
  return data as Room[];
}

export async function getRoomImages(roomId: string): Promise<RoomImage[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createServerAnonSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("room_images")
    .select("*")
    .eq("room_id", roomId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as RoomImage[];
}

export function getPublicImageUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "room-images";
  return `${base}/storage/v1/object/public/${bucket}/${storagePath}`;
}
