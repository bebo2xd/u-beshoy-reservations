"use client";

import { cn } from "@/lib/utils";
import type { OccupancyBlock } from "@/lib/types";

interface SlotCellProps {
  hour: number;
  blocks: OccupancyBlock[];
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function SlotCell({ hour, blocks, selected, onClick, compact }: SlotCellProps) {
  const block = blocks[0];
  const busy = Boolean(block);
  const isBlackout = block?.kind === "blackout";
  const isPending = block?.kind === "pending";
  const isRecurring = block?.kind === "recurring";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      title={
        busy
          ? `${block.title}${block.needs_review ? " (يحتاج مراجعة)" : ""}`
          : `متاح — الساعة ${hour}`
      }
      className={cn(
        "relative w-full border border-border/60 text-right transition-colors",
        compact ? "min-h-10 px-1.5 py-1 text-[10px] leading-tight" : "min-h-12 px-2 py-1.5 text-xs",
        !busy && "bg-card hover:bg-teal-3 cursor-pointer",
        !busy && selected && "bg-primary text-primary-foreground hover:bg-primary ring-2 ring-ring ring-inset",
        busy && isBlackout && "slot-striped cursor-not-allowed text-sand-11",
        busy && isPending && "bg-amber-3 text-amber-11 cursor-not-allowed",
        busy && isRecurring && "cursor-not-allowed text-white",
        busy && block?.kind === "booking" && "cursor-not-allowed text-white",
        busy && block?.needs_review && "ring-1 ring-inset ring-amber-9"
      )}
      style={
        busy && !isBlackout && !isPending
          ? { backgroundColor: block.color ?? "#12A594" }
          : undefined
      }
    >
      {busy ? (
        <span className="line-clamp-2 font-medium">{block.title}</span>
      ) : selected ? (
        <span className="font-medium">مختار</span>
      ) : null}
    </button>
  );
}
