import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { AccountForm } from "@/components/admin/AccountForm";
import { ScreenHeader } from "@/components/ui/screen-header";
import { FormSkeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <ScreenHeader
        title="حسابي"
        description="تعديل الاسم والتليفون والبريد وكلمة المرور"
      />
      <Suspense fallback={<FormSkeleton />}>
        <AccountBody />
      </Suspense>
    </div>
  );
}

async function AccountBody() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin/account");
  return <AccountForm profile={profile as Profile} />;
}
