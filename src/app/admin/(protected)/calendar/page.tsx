import Link from "next/link";
import { getWeekScheduleData } from "@/lib/data";
import { getWeekStartFriday, todayCairo } from "@/lib/dates";
import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { ScreenHeader } from "@/components/ui/screen-header";

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
  const data = await getWeekScheduleData(week, { hideClosedDays: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ScreenHeader
          title="التقويم"
          description="عرض كامل للأسبوع مع إمكانية إضافة حجز إداري"
        />
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
