import Link from "next/link";
import { Church, Search } from "lucide-react";
import { BookingBoard } from "@/components/booking/BookingBoard";
import { getWeekScheduleData } from "@/lib/data";
import { getWeekStartFriday, todayCairo } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const week = params.week
    ? getWeekStartFriday(params.week)
    : getWeekStartFriday(todayCairo());

  const { days, rooms, occupancy, settings, friday } = await getWeekScheduleData(week);

  return (
    <div className="min-h-screen bg-sand-1">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Church className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold sm:text-xl">{settings.site_title}</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                الحجز من الجمعة للخميس · 11 ص – 9 م · بالساعة
              </p>
            </div>
          </div>
          <Link
            href="/r"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">متابعة طلب</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 pb-28">
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-lg font-semibold">لا توجد أماكن بعد</p>
            <p className="mt-2 text-sm text-muted-foreground">
              تأكد من إعداد قاعدة البيانات وتشغيل ملف الـ seed، أو أضف الأماكن من لوحة التحكم.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
            >
              الذهاب للوحة التحكم
            </Link>
          </div>
        ) : (
          <BookingBoard
            days={days}
            rooms={rooms}
            occupancy={occupancy}
            settings={settings}
            weekStart={friday}
          />
        )}
      </main>
    </div>
  );
}
