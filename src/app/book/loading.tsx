import { BrandLogo } from "@/components/brand/BrandLogo";
import { BookingSkeleton } from "@/components/booking/BookingSkeleton";

export default function BookLoading() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <BrandLogo size={40} />
          <div className="space-y-2">
            <div className="h-5 w-40 animate-shimmer rounded-lg" />
            <div className="h-4 w-28 animate-shimmer rounded-lg" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4 pb-28">
        <BookingSkeleton />
      </main>
    </div>
  );
}
