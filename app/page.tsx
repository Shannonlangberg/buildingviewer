import { Suspense } from "react";
import { BuildingShell } from "@/components/BuildingShell";
import { getActiveFloorplan, getRooms } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [rooms, floorplan] = await Promise.all([
    getRooms(),
    getActiveFloorplan(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#070a0f] text-slate-400">
          Loading…
        </div>
      }
    >
      <BuildingShell initialRooms={rooms} initialFloorplan={floorplan} />
    </Suspense>
  );
}
