import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeEnvValue } from "@/lib/env-trim";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** Browser / public reads */
export function createBrowserSupabase(): SupabaseClient {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) {
    throw new Error("Supabase env not configured");
  }
  return createClient(url, key);
}

/** Server: privileged writes (API routes only) */
export function createServiceSupabase(): SupabaseClient {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error("Supabase service role not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Server components / anon reads */
export function createServerAnonSupabase(): SupabaseClient | null {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
