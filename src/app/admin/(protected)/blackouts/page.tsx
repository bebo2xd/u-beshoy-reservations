import { getActiveRooms, getBlackouts, getSettings } from "@/lib/data";
import { BlackoutsManager } from "@/components/admin/BlackoutsManager";

export const dynamic = "force-dynamic";

export default async function BlackoutsPage() {
  const [blackouts, rooms, settings] = await Promise.all([
    getBlackouts(),
    getActiveRooms(),
    getSettings(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الأوقات المقفولة</h1>
        <p className="text-sm text-muted-foreground">
          قفل ساعات أو إغلاق أيام كاملة (صوم، أفراح، خماسين…) واجتماع الخدام
        </p>
      </div>
      <BlackoutsManager
        blackouts={blackouts as never}
        rooms={rooms}
        slotDurationMinutes={settings.slot_duration_minutes ?? 60}
      />
    </div>
  );
}
