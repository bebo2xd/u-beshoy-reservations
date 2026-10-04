import { getActiveRooms, getBlackouts, getSettings } from "@/lib/data";
import { BlackoutsManager } from "@/components/admin/BlackoutsManager";
import { ScreenHeader } from "@/components/ui/screen-header";

export const dynamic = "force-dynamic";

export default async function BlackoutsPage() {
  const [blackouts, rooms, settings] = await Promise.all([
    getBlackouts(),
    getActiveRooms(),
    getSettings(),
  ]);
  return (
    <div className="space-y-6">
      <ScreenHeader
        title="الأوقات المقفولة"
        description="قفل ساعات أو إغلاق أيام كاملة، مثل الصوم والأفراح والخماسين واجتماع الخدام"
      />
      <BlackoutsManager
        blackouts={blackouts as never}
        rooms={rooms}
        slotDurationMinutes={settings.slot_duration_minutes ?? 60}
      />
    </div>
  );
}
