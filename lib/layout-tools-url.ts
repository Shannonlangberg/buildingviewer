/** Shared server + client: URL enables layout tools panel. */
export function urlEnablesLayoutTools(
  searchParams: Record<string, string | string[] | undefined> | undefined
): boolean {
  if (!searchParams) return false;
  const editRaw = searchParams.edit;
  const edit = Array.isArray(editRaw) ? editRaw[0] : editRaw;
  const e = (edit ?? "").toLowerCase();
  if (e === "1" || e === "true" || e === "yes") return true;
  const layoutRaw = searchParams.layout;
  const layout = Array.isArray(layoutRaw) ? layoutRaw[0] : layoutRaw;
  return layout === "1";
}
