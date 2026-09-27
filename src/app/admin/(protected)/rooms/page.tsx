import { getAllRooms } from "@/lib/data";
import { RoomsManager } from "@/components/admin/RoomsManager";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const rooms = await getAllRooms();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الأماكن</h1>
        <p className="text-sm text-muted-foreground">
          إضافة وتعديل الأماكن (ديناميكية بالكامل)
        </p>
      </div>
      <RoomsManager rooms={rooms} />
    </div>
  );
}
