"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeHour } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface HourSelectProps {
  value: number;
  onChange: (hour: number) => void;
  /** Inclusive start of range (default 0) */
  min?: number;
  /**
   * Exclusive end for hourly mode (default 25 → options 0..24).
   * With step 0.5, options go from min through the last boundary ≤ maxExclusive-ε,
   * and 24 is included when maxExclusive is 25.
   */
  maxExclusive?: number;
  /** Slot step in hours: 1 = hourly, 0.5 = half-hour */
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

function labelForHour(hour: number): string {
  const h = normalizeHour(hour);
  if (h === 24) return "12:00 صباحاً (منتصف الليل)";
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  const isAm = whole < 12;
  let display = whole % 12;
  if (display === 0) display = 12;
  const period = isAm ? "صباحاً" : "مساءً";
  if (mins === 0) return `${display}:00 ${period}`;
  return `${display}:${String(mins).padStart(2, "0")} ${period}`;
}

function buildHourOptions(min: number, maxExclusive: number, step: number): number[] {
  const maxInclusive = maxExclusive === 25 ? 24 : maxExclusive - step;
  const hours: number[] = [];
  for (let h = min; h <= maxInclusive + 1e-9; h += step) {
    hours.push(normalizeHour(h));
  }
  return hours;
}

export function HourSelect({
  value,
  onChange,
  min = 0,
  maxExclusive = 25,
  step = 1,
  placeholder = "اختر الساعة",
  disabled,
  id,
  className,
}: HourSelectProps) {
  const hours = buildHourOptions(min, maxExclusive, step);
  const valueKey = Number.isFinite(value) ? String(normalizeHour(value)) : undefined;

  return (
    <Select
      value={valueKey}
      onValueChange={(v) => onChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "h-12 rounded-xl px-3.5 text-base font-semibold shadow-sm",
          "transition-colors duration-200",
          "hover:border-teal-9/40 hover:bg-sand-2",
          "[&>svg]:text-sand-11 [&>svg]:opacity-100",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {hours.map((h) => (
          <SelectItem
            key={String(h)}
            value={String(h)}
            className="text-base font-semibold"
          >
            {labelForHour(h)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
