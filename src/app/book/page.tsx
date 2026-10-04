import { redirect } from "next/navigation";
import { BookingBoard } from "@/components/booking/BookingBoard";
import { MemberShell } from "@/components/shell/MemberShell";
import { getWeekScheduleData } from "@/lib/data";
import { getWeekStartFriday, todayCairo } from "@/lib/dates";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/book");

  const supabase = await createClient();
  const { data: permissionsHasAdmin } = await supabase.rpc("is_admin");

  const params = await searchParams;
  const week = params.week
    ? getWeekStartFriday(params.week)
    : getWeekStartFriday(todayCairo());

  const { days, rooms, occupancy, settings, friday } =
    await getWeekScheduleData(week);

  return (
    <MemberShell
      title={settings.site_title}
      subtitle={`مرحباً، ${profile.full_name}`}
      showAdmin={Boolean(permissionsHasAdmin)}
    >
      {rooms.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <p className="text-xl font-bold">لا توجد أماكن بعد</p>
          <p className="mt-2 text-base text-muted-foreground">
            تأكد من إعداد قاعدة البيانات، أو أضف الأماكن من لوحة التحكم.
          </p>
        </div>
      ) : (
        <BookingBoard
          days={days}
          rooms={rooms}
          occupancy={occupancy}
          settings={settings}
          weekStart={friday}
          requesterName={profile.full_name}
          requesterPhone={profile.phone}
        />
      )}
    </MemberShell>
  );
}
