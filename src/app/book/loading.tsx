import { BrandLogo } from "@/components/brand/BrandLogo";
import { BookingSkeleton } from "@/components/booking/BookingSkeleton";

export default function BookLoading() {
  return (
    <div className="min-h-screen bg-sand-2">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-5 sm:px-6">
          <BrandLogo size={56} />
          <div>
            <div className="h-7 w-52 animate-shimmer rounded-lg bg-sand-3" />
            <div className="mt-2 h-5 w-72 animate-shimmer rounded-lg bg-sand-3" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 pb-28">
        <BookingSkeleton />
      </main>
    </div>
  );
}
