export type CapabilitiesPayload = {
  canPersist: boolean;
  hasSupabaseUrl: boolean;
  hasServiceRoleKey: boolean;
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

/** Service role JWT is three dot-separated segments; template strings fail this. */
function looksLikeServiceRoleKey(key: string): boolean {
  if (!key) return false;
  if (/your_service|changeme|placeholder|paste_here/i.test(key)) return false;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length >= 20);
}

export function getCapabilitiesPayload(): CapabilitiesPayload {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const hasSupabaseUrl = looksLikeSupabaseProjectUrl(url);
  const hasServiceRoleKey = looksLikeServiceRoleKey(key);
  return {
    hasSupabaseUrl,
    hasServiceRoleKey,
    canPersist: hasSupabaseUrl && hasServiceRoleKey,
  };
}
