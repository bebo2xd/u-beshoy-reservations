import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-shimmer rounded-xl bg-sand-3", className)}
      {...props}
    />
  );
}

export function ScreenHeaderSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card"
      aria-busy="true"
      aria-label="جاري التحميل"
    >
      <div className="flex gap-3 border-b border-border bg-muted px-4 py-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="hidden h-8 w-16 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="جاري التحميل">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-3xl border border-border/80 bg-card p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-2xl" />
            <Skeleton className="h-14 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div
      className="space-y-4 rounded-3xl border border-border bg-card p-5"
      aria-busy="true"
      aria-label="جاري التحميل"
    >
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-12 w-36" />
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="جاري التحميل">
      <div className="flex items-center gap-2">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-12 w-48 rounded-xl" />
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card p-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex gap-2 border-b border-border py-2 last:border-0">
            <Skeleton className="h-12 w-28 shrink-0" />
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-12 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoginSkeleton() {
  return (
    <div className="w-full max-w-md" aria-busy="true" aria-label="جاري التحميل">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Skeleton className="h-[76px] w-[76px] rounded-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="space-y-4 rounded-3xl border border-border/80 bg-card p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function AdminPageSkeleton() {
  return (
    <div className="space-y-6">
      <ScreenHeaderSkeleton />
      <CardListSkeleton count={2} />
      <TableSkeleton rows={6} />
    </div>
  );
}
