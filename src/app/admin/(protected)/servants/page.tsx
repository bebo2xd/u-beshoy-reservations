import { createAdminClient } from "@/lib/supabase/admin";
import { ServantsManager } from "@/components/admin/ServantsManager";
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
      <div>
        <h1 className="text-2xl font-bold">الخدام</h1>
        <p className="text-sm text-muted-foreground">
          إدارة حسابات الخدام وصلاحياتهم — الحجز متاح للمسجّلين فقط
        </p>
      </div>
      <ServantsManager servants={(data as Profile[]) ?? []} />
    </div>
  );
}
