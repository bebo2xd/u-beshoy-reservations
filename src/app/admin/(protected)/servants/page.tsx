import { createAdminClient } from "@/lib/supabase/admin";
import { ServantsManager } from "@/components/admin/ServantsManager";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ServantsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <ScreenHeader
        title="الخدام"
        description="إدارة حسابات الخدام وصلاحياتهم. الحجز متاح للمسجّلين فقط."
      />
      <ServantsManager servants={(data as Profile[]) ?? []} />
    </div>
  );
}
