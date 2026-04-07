import { NextResponse } from "next/server";
import { getCapabilitiesPayload } from "@/lib/server-capabilities";

/** Runtime probe for Supabase write config (no secrets exposed). */
export async function GET() {
  return NextResponse.json(getCapabilitiesPayload());
}
