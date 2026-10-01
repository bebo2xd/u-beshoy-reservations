"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function BookingDeepLinkTarget({
  bookingId,
  focused,
  children,
  className,
}: {
  bookingId: string;
  focused?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focused]);

  return (
    <div
      ref={ref}
      id={`booking-${bookingId}`}
      className={cn(
        className,
        focused &&
          "rounded-xl ring-2 ring-amber-500 ring-offset-2 ring-offset-background"
      )}
    >
      {children}
    </div>
  );
}
