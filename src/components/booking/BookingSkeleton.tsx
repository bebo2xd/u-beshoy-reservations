import { Skeleton } from "@/components/ui/skeleton";

export function BookingSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in" aria-busy="true" aria-label="جاري التحميل">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="h-12 w-56 rounded-xl" />
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <div className="flex gap-2 overflow-hidden lg:hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-[88px] shrink-0 rounded-2xl" />
        ))}
      </div>

      <div className="space-y-4 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-7 w-40" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, j) => (
                <Skeleton key={j} className="h-14 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:block rounded-2xl border border-border bg-card p-4 space-y-3">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-12 w-36 shrink-0" />
            {Array.from({ length: 10 }).map((_, j) => (
              <Skeleton key={j} className="h-12 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
