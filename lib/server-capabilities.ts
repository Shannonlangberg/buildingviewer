export type CapabilitiesPayload = {
  canPersist: boolean;
  hasSupabaseUrl: boolean;
  hasServiceRoleKey: boolean;
};

export function getCapabilitiesPayload(): CapabilitiesPayload {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  return {
    hasSupabaseUrl: Boolean(url),
    hasServiceRoleKey: Boolean(key),
    canPersist: Boolean(url && key),
  };
}
