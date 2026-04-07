import { BuildingShell } from "@/components/BuildingShell";
import { getActiveFloorplan, getRooms } from "@/lib/data";
import { urlEnablesLayoutTools } from "@/lib/layout-tools-url";
import { MOCK_FLOORPLAN, MOCK_ROOMS } from "@/lib/mock-data";
import { getCapabilitiesPayload } from "@/lib/server-capabilities";

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

  const initialCapabilities = getCapabilitiesPayload();

  return (
    <BuildingShell
      initialRooms={rooms}
      initialFloorplan={floorplan}
      urlShowsLayoutTools={urlShowsLayoutTools}
      initialCapabilities={initialCapabilities}
    />
  );
}
