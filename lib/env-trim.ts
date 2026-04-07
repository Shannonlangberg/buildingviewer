/** Trim + strip one layer of surrounding quotes (common in Railway / .env pastes). */
export function normalizeEnvValue(s: string | undefined): string {
  if (s == null) return "";
  let t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}
