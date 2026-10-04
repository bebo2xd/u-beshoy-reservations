import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BookingBoard } from "@/components/booking/BookingBoard";
import { BookingSkeleton } from "@/components/booking/BookingSkeleton";
import { MemberShell } from "@/components/shell/MemberShell";
import { getSettings, getWeekScheduleData } from "@/lib/data";
import { getWeekStartFriday, todayCairo } from "@/lib/dates";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/book");

  const [params, supabase, settings] = await Promise.all([
    searchParams,
    createClient(),
    getSettings(),
  ]);
  const { data: permissionsHasAdmin } = await supabase.rpc("is_admin");

  const week = params.week
    ? getWeekStartFriday(params.week)
    : getWeekStartFriday(todayCairo());

  return (
    <MemberShell
      title={settings.site_title}
      subtitle={`مرحباً، ${profile.full_name}`}
      showAdmin={Boolean(permissionsHasAdmin)}
    >
      <Suspense key={week} fallback={<BookingSkeleton />}>
        <BookWeekContent week={week} profile={profile} />
      </Suspense>
    </MemberShell>
  );
}

async function BookWeekContent({
  week,
  profile,
}: {
  week: string;
  profile: Profile;
}) {
  const { days, rooms, occupancy, settings, friday } =
    await getWeekScheduleData(week);

  if (rooms.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
        <p className="text-xl font-bold">لا توجد أماكن بعد</p>
        <p className="mt-2 text-base text-muted-foreground">
          تأكد من إعداد قاعدة البيانات، أو أضف الأماكن من لوحة التحكم.
        </p>
      </div>
    );
  }

  return (
    <BookingBoard
      days={days}
      rooms={rooms}
      occupancy={occupancy}
      settings={settings}
      weekStart={friday}
      requesterName={profile.full_name}
      requesterPhone={profile.phone}
    />
  );
}
