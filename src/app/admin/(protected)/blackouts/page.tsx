import { getActiveRooms, getBlackouts } from "@/lib/data";
import { BlackoutsManager } from "@/components/admin/BlackoutsManager";

export const dynamic = "force-dynamic";

export default async function BlackoutsPage() {
  const [blackouts, rooms] = await Promise.all([getBlackouts(), getActiveRooms()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الأوقات المقفولة</h1>
        <p className="text-sm text-muted-foreground">
          قفل مواعيد معينة أو اجتماع الخدام الشهري
        </p>
      </div>
      <BlackoutsManager blackouts={blackouts as never} rooms={rooms} />
    </div>
  );
}
