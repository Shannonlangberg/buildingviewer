import { normalizeEnvValue } from "@/lib/env-trim";

export type CapabilitiesPayload = {
  canPersist: boolean;
  hasSupabaseUrl: boolean;
  hasServiceRoleKey: boolean;
  /** Non-empty env value present but failed URL shape check (wrong host, quotes, etc.). */
  supabaseUrlPresentButInvalid: boolean;
  /** Non-empty env value present but failed JWT shape check (truncated, quotes, anon key by mistake). */
  serviceRoleKeyPresentButInvalid: boolean;
};

/** Reject .env.example placeholders so “full local” isn’t a false positive. */
function looksLikeSupabaseProjectUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h === "127.0.0.1" || h === "localhost") return true;
    if (!h.endsWith(".supabase.co")) return false;
    if (/your|placeholder|example|^api\./i.test(h)) return false;
    const sub = h.replace(/\.supabase\.co$/, "");
    return sub.length >= 8 && /^[a-z0-9]+$/.test(sub);
  } catch {
    return false;
  }
}

/** Service role JWT: three dot-separated base64url segments (Supabase uses standard JWTs). */
function looksLikeServiceRoleKey(key: string): boolean {
  if (!key) return false;
  if (/your_service|changeme|placeholder|paste_here/i.test(key)) return false;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length >= 10);
}

export function getCapabilitiesPayload(): CapabilitiesPayload {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const urlPresent = Boolean(url);
  const keyPresent = Boolean(key);
  const hasSupabaseUrl = looksLikeSupabaseProjectUrl(url);
  const hasServiceRoleKey = looksLikeServiceRoleKey(key);
  return {
    hasSupabaseUrl,
    hasServiceRoleKey,
    canPersist: hasSupabaseUrl && hasServiceRoleKey,
    supabaseUrlPresentButInvalid: urlPresent && !hasSupabaseUrl,
    serviceRoleKeyPresentButInvalid: keyPresent && !hasServiceRoleKey,
  };
}
