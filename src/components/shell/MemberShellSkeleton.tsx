import { BrandLogo } from "@/components/brand/BrandLogo";
import { Skeleton } from "@/components/ui/skeleton";

export function MemberShellSkeleton({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/80 bg-card pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <BrandLogo size={40} />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="h-12 w-12 rounded-2xl" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-10">
        {children}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-2 py-3">
          <Skeleton className="mx-auto h-10 w-16" />
          <Skeleton className="mx-auto h-10 w-16" />
        </div>
      </div>
    </div>
  );
}
