import Link from "next/link";
import { getWeekScheduleData } from "@/lib/data";
import { getWeekStartFriday, todayCairo } from "@/lib/dates";
import { AdminCalendar } from "@/components/admin/AdminCalendar";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const week = params.week
    ? getWeekStartFriday(params.week)
    : getWeekStartFriday(todayCairo());
  const data = await getWeekScheduleData(week);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">التقويم</h1>
          <p className="text-sm text-muted-foreground">
            عرض كامل للأسبوع مع إمكانية إضافة حجز إداري
          </p>
        </div>
        <Link
          href={`/book?week=${data.friday}`}
          className="text-sm text-primary hover:underline"
        >
          فتح العرض العام
        </Link>
      </div>
      <AdminCalendar
        days={data.days}
        rooms={data.rooms}
        occupancy={data.occupancy}
        settings={data.settings}
        weekStart={data.friday}
      />
    </div>
  );
}
