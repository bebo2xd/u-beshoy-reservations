import { createAdminClient } from "@/lib/supabase/admin";
import { PermissionsManager } from "@/components/admin/PermissionsManager";
import type { AppRole } from "@/lib/types";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/session";
import { ScreenHeader } from "@/components/ui/screen-header";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const auth = await requirePermission("manage_permissions");
  if (!auth.ok) redirect("/admin");

  const admin = createAdminClient();
  const { data } = await admin.from("role_permissions").select("role, permission");

  const initial: Record<AppRole, string[]> = {
    admin: [...DEFAULT_ROLE_PERMISSIONS.admin],
    servant: [...DEFAULT_ROLE_PERMISSIONS.servant],
  };

  if (data?.length) {
    initial.admin = [];
    initial.servant = [];
    for (const row of data) {
      const role = row.role as AppRole;
      if (role === "admin" || role === "servant") {
        initial[role].push(row.permission);
      }
    }
  }

  return (
    <div className="space-y-6">
      <ScreenHeader
        title="الصلاحيات"
        description="تحكم في صلاحيات دور الأدمن والخادم. صلاحيات خادم معيّن تتعدل من صفحة الخدام."
      />
      <PermissionsManager initialRole="servant" initialPermissions={initial} />
    </div>
  );
}
