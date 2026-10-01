import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, LogOut, Shield } from "lucide-react";
import { BookingBoard } from "@/components/booking/BookingBoard";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getWeekScheduleData } from "@/lib/data";
import { getWeekStartFriday, todayCairo } from "@/lib/dates";
import { getProfile } from "@/lib/auth/session";
import { logoutAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-sand-2">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3.5 animate-fade-in">
            <BrandLogo size={56} className="shadow-sm" priority />
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                {settings.site_title}
              </h1>
              <p className="mt-0.5 text-sm font-medium text-sand-11 sm:text-base">
                مرحباً، {profile.full_name}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/my-bookings"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-base font-semibold shadow-sm transition-colors hover:bg-secondary active:scale-95"
            >
              <ClipboardList className="h-5 w-5" />
              <span className="hidden sm:inline">طلباتي</span>
            </Link>
            {permissionsHasAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-base font-semibold shadow-sm transition-colors hover:bg-secondary"
              >
                <Shield className="h-5 w-5" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </Link>
            )}
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="lg" className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 pb-32">
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center animate-fade-in">
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
      </main>
    </div>
  );
}
