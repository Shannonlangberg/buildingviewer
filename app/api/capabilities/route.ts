import { NextResponse } from "next/server";
import { getCapabilitiesPayload } from "@/lib/server-capabilities";

/** Must run per-request: Railway often injects secrets at runtime, not Docker build. */
export const dynamic = "force-dynamic";

/** Runtime probe for Supabase write config (no secrets exposed). */
export async function GET() {
  return NextResponse.json(getCapabilitiesPayload(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
