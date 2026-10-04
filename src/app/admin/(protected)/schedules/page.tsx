import { Suspense } from "react";
import { getActiveRooms, getSchedulesWithRooms, getSettings } from "@/lib/data";
import { SchedulesManager } from "@/components/admin/SchedulesManager";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TableSkeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function SchedulesPage() {
  return (
    <div className="space-y-6">
      <ScreenHeader
        title="المواعيد الثابتة"
        description="جدول قابل للبحث والفلترة مع ترتيب بالسحب والإفلات وحذف ناعم"
      />
      <Suspense fallback={<TableSkeleton />}>
        <SchedulesBody />
      </Suspense>
    </div>
  );
}

async function SchedulesBody() {
  const [schedules, rooms, settings] = await Promise.all([
    getSchedulesWithRooms(),
    getActiveRooms(),
    getSettings(),
  ]);

  return (
    <SchedulesManager
      schedules={schedules}
      rooms={rooms}
      slotDurationMinutes={settings.slot_duration_minutes ?? 60}
    />
  );
}
