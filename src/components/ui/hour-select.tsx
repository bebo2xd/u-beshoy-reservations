"use client";

import { Clock } from "lucide-react";
import { hourLabel } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface HourSelectProps {
  value: number;
  onChange: (hour: number) => void;
  /** Inclusive start of range (default 0) */
  min?: number;
  /** Exclusive end of range — last option is max-1, or include 24 if max=25 (default 25 → 0..24) */
  maxExclusive?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Show clock icon inside the trigger */
  showIcon?: boolean;
}

function labelForHour(hour: number): string {
  if (hour === 24) return "12 ص (منتصف الليل)";
  return hourLabel(hour);
}

export function HourSelect({
  value,
  onChange,
  min = 0,
  maxExclusive = 25,
  placeholder = "اختر الساعة",
  disabled,
  id,
  className,
  showIcon = true,
}: HourSelectProps) {
  const hours: number[] = [];
  for (let h = min; h < maxExclusive; h++) hours.push(h);

  return (
    <Select
      value={Number.isFinite(value) ? String(value) : undefined}
      onValueChange={(v) => onChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "h-12 rounded-xl px-3.5 text-base font-semibold shadow-sm",
          "hover:border-teal-9/35 focus:border-teal-9/50",
          className
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 text-right">
          {showIcon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-3 text-teal-11">
              <Clock className="h-4 w-4" />
            </span>
          )}
          <SelectValue placeholder={placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {hours.map((h) => (
          <SelectItem key={h} value={String(h)} className="text-base font-semibold">
            {labelForHour(h)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
