import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { AccountForm } from "@/components/admin/AccountForm";
import { ScreenHeader } from "@/components/ui/screen-header";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/account");

  return (
    <div className="space-y-6">
      <ScreenHeader
        title="حسابي"
        description="تعديل الاسم والتليفون والبريد وكلمة المرور"
      />
      <AccountForm profile={profile} />
    </div>
  );
}
