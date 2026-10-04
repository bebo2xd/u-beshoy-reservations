import { Suspense } from "react";
import { getAllRooms } from "@/lib/data";
import { RoomsManager } from "@/components/admin/RoomsManager";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TableSkeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function RoomsPage() {
  return (
    <div className="space-y-6">
      <ScreenHeader
        title="الأماكن"
        description="جدول قابل للبحث والفلترة مع ترتيب بالسحب والإفلات وحذف ناعم"
      />
      <Suspense fallback={<TableSkeleton />}>
        <RoomsBody />
      </Suspense>
    </div>
  );
}

async function RoomsBody() {
  const rooms = await getAllRooms();
  return <RoomsManager rooms={rooms} />;
}
