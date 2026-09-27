import { getActiveRooms, getSchedulesWithRooms } from "@/lib/data";
import { SchedulesManager } from "@/components/admin/SchedulesManager";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const [schedules, rooms] = await Promise.all([
    getSchedulesWithRooms(),
    getActiveRooms(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المواعيد الثابتة</h1>
        <p className="text-sm text-muted-foreground">
          الجدول الأسبوعي الافتراضي — قابل للتعديل
        </p>
      </div>
      <SchedulesManager schedules={schedules as never} rooms={rooms} />
    </div>
  );
}
