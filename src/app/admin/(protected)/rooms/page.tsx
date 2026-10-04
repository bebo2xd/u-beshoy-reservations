import { getAllRooms } from "@/lib/data";
import { RoomsManager } from "@/components/admin/RoomsManager";
import { ScreenHeader } from "@/components/ui/screen-header";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const rooms = await getAllRooms();
  return (
    <div className="space-y-6">
      <ScreenHeader
        title="الأماكن"
        description="جدول قابل للبحث والفلترة مع ترتيب بالسحب والإفلات وحذف ناعم"
      />
      <RoomsManager rooms={rooms} />
    </div>
  );
}
