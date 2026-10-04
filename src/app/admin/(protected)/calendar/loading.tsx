import { CalendarSkeleton, ScreenHeaderSkeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      <ScreenHeaderSkeleton />
      <CalendarSkeleton />
    </div>
  );
}
