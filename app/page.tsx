import { BuildingShell } from "@/components/BuildingShell";
import { getActiveFloorplan, getRooms } from "@/lib/data";
import { urlEnablesLayoutTools } from "@/lib/layout-tools-url";
import { MOCK_FLOORPLAN, MOCK_ROOMS } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function Home({ searchParams }: PageProps) {
  let rooms;
  let floorplan;
  try {
    [rooms, floorplan] = await Promise.all([
      getRooms(),
      getActiveFloorplan(),
    ]);
  } catch (e) {
    console.error("Home data load:", e);
    rooms = MOCK_ROOMS;
    floorplan = MOCK_FLOORPLAN;
  }

  const urlShowsLayoutTools = urlEnablesLayoutTools(searchParams ?? {});

  /** Server-only env read (not inlined like client `NEXT_PUBLIC_*`), so Railway/runtime config works. */
  const canPersist = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return (
    <BuildingShell
      initialRooms={rooms}
      initialFloorplan={floorplan}
      urlShowsLayoutTools={urlShowsLayoutTools}
      canPersist={canPersist}
    />
  );
}
