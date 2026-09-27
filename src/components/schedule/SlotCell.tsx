"use client";

import { cn } from "@/lib/utils";
import type { OccupancyBlock } from "@/lib/types";

interface SlotCellProps {
  hour: number;
  blocks: OccupancyBlock[];
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  /** تاريخ ماضي — يظهر المحتوى، والفاضي رصاصي وغير قابل للحجز */
  past?: boolean;
}

export function SlotCell({
  hour,
  blocks,
  selected,
  onClick,
  compact,
  past,
}: SlotCellProps) {
  const block = blocks[0];
  const busy = Boolean(block);
  const isBlackout = block?.kind === "blackout";
  const isPending = block?.kind === "pending";
  const locked = busy || past;

  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      title={
        past && !busy
          ? "تاريخ ماضي — غير متاح للحجز"
          : busy
            ? block.title
            : `متاح — الساعة ${hour}`
      }
      className={cn(
        "relative flex w-full items-center justify-center rounded-xl border text-center transition-all duration-200 active:scale-[0.97]",
        compact
          ? "min-h-[3.25rem] px-2 py-1.5 text-[13px] leading-snug font-semibold"
          : "min-h-14 px-2.5 py-2 text-sm font-semibold",
        // فاضي + ماضي: رصاصي بدون نص
        past &&
          !busy &&
          "cursor-not-allowed border-sand-5 bg-sand-4 text-sand-11 shadow-none",
        // فاضي + مستقبل/اليوم
        !past &&
          !busy &&
          "border-sand-5 bg-card text-sand-11 hover:border-primary hover:bg-teal-3 hover:text-teal-12 cursor-pointer shadow-sm",
        !past &&
          !busy &&
          selected &&
          "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md animate-soft-pulse",
        // مشغول (ماضي أو لا) — نفس الألوان عادي
        busy && isBlackout && "slot-striped cursor-not-allowed text-sand-11 border-sand-5",
        busy && isPending && "bg-amber-3 text-amber-11 border-amber-9 cursor-not-allowed",
        busy &&
          !isBlackout &&
          !isPending &&
          "cursor-not-allowed text-white border-transparent shadow-sm"
      )}
      style={
        busy && !isBlackout && !isPending
          ? { backgroundColor: block.color ?? "#12A594" }
          : undefined
      }
    >
      {busy ? (
        <span className="line-clamp-2">{block.title}</span>
      ) : selected ? (
        <span>✓ مختار</span>
      ) : null}
    </button>
  );
}
