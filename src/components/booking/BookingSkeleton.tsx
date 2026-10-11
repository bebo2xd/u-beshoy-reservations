import { Skeleton } from "@/components/ui/skeleton";

export function BookingSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in" aria-busy="true" aria-label="جاري التحميل">
      <Skeleton className="h-4 w-72 max-w-full" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Skeleton className="h-14 w-12 rounded-2xl" />
          <Skeleton className="h-14 min-w-0 flex-1 rounded-2xl sm:w-72" />
          <Skeleton className="h-14 w-12 rounded-2xl" />
        </div>
        <div className="hidden gap-2 lg:flex">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <Skeleton className="h-7 w-40" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, j) => (
                <Skeleton key={j} className="h-14 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden space-y-3 rounded-2xl border border-border bg-card p-4 lg:block">
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
