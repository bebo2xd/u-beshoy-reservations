import { getActiveRooms, getSchedulesWithRooms, getSettings } from "@/lib/data";
import { SchedulesManager } from "@/components/admin/SchedulesManager";
import { ScreenHeader } from "@/components/ui/screen-header";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const [schedules, rooms, settings] = await Promise.all([
    getSchedulesWithRooms(),
    getActiveRooms(),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <ScreenHeader
        title="المواعيد الثابتة"
        description="جدول قابل للبحث والفلترة مع ترتيب بالسحب والإفلات وحذف ناعم"
      />
      <SchedulesManager
        schedules={schedules}
        rooms={rooms}
        slotDurationMinutes={settings.slot_duration_minutes ?? 60}
      />
    </div>
  );
}
