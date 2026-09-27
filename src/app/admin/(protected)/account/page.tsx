import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { AccountForm } from "@/components/admin/AccountForm";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/account");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">حسابي</h1>
        <p className="text-sm text-muted-foreground">
          تعديل الاسم والتليفون والبريد وكلمة المرور
        </p>
      </div>
      <AccountForm profile={profile} />
    </div>
  );
}
