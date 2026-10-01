import { getActiveRooms, getSchedulesWithRooms, getSettings } from "@/lib/data";
import { SchedulesManager } from "@/components/admin/SchedulesManager";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const [schedules, rooms, settings] = await Promise.all([
    getSchedulesWithRooms(),
    getActiveRooms(),
    getSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المواعيد الثابتة</h1>
        <p className="text-sm text-muted-foreground">
          جدول قابل للبحث والفلترة مع ترتيب بالسحب والإفلات وحذف ناعم
        </p>
      </div>
      <SchedulesManager
        schedules={schedules}
        rooms={rooms}
        slotDurationMinutes={settings.slot_duration_minutes ?? 60}
      />
    </div>
  );
}
