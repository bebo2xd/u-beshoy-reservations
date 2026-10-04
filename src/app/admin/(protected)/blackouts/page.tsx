import { Suspense } from "react";
import { getActiveRooms, getBlackouts, getSettings } from "@/lib/data";
import { BlackoutsManager } from "@/components/admin/BlackoutsManager";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TableSkeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function BlackoutsPage() {
  return (
    <div className="space-y-6">
      <ScreenHeader
        title="الأوقات المقفولة"
        description="قفل ساعات أو إغلاق أيام كاملة، مثل الصوم والأفراح والخماسين واجتماع الخدام"
      />
      <Suspense fallback={<TableSkeleton />}>
        <BlackoutsBody />
      </Suspense>
    </div>
  );
}

async function BlackoutsBody() {
  const [blackouts, rooms, settings] = await Promise.all([
    getBlackouts(),
    getActiveRooms(),
    getSettings(),
  ]);
  return (
    <BlackoutsManager
      blackouts={blackouts as never}
      rooms={rooms}
      slotDurationMinutes={settings.slot_duration_minutes ?? 60}
    />
  );
}
