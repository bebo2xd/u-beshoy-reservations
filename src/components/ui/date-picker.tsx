"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  startOfMonth,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import { DAY_SHORT_AR, WEEK_ORDER } from "@/lib/constants";
import { formatDateAr, todayCairo, cairoNoon } from "@/lib/dates";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTH_NAMES_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  id?: string;
}

function monthGrid(viewMonth: Date) {
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStartOffset = (monthStart.getDay() - 5 + 7) % 7;
  const gridStart = addDays(monthStart, -gridStartOffset);
  const cells = eachDayOfInterval({
    start: gridStart,
    end: addDays(gridStart, 41),
  });
  const lastNeeded = cells.findIndex(
    (d, i) => i >= 28 && d > monthEnd && (i + 1) % 7 === 0
  );
  return lastNeeded >= 0 ? cells.slice(0, lastNeeded + 1) : cells;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  disabled,
  allowClear = true,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = todayCairo();
  const selected = value ? cairoNoon(value) : null;
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(selected ?? cairoNoon(today))
  );

  const days = useMemo(() => monthGrid(viewMonth), [viewMonth]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setViewMonth(startOfMonth(selected ?? cairoNoon(today)));
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={placeholder}
          className={cn(
            "group flex h-12 w-full items-center gap-2.5 rounded-xl px-3.5 text-right",
            "border border-input bg-card text-base font-semibold shadow-sm",
            "transition-colors duration-200",
            "hover:border-teal-9/40 hover:bg-sand-2",
            "focus-visible:outline-none focus-visible:border-teal-9/50 focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            "active:scale-[0.995]",
            className
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-3 text-teal-11">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 truncate">
            {value ? (
              <span className="text-foreground">{formatDateAr(value)}</span>
            ) : (
              <span className="font-medium text-muted-foreground">{placeholder}</span>
            )}
          </span>
          {allowClear && value ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="مسح التاريخ"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sand-11 transition hover:bg-sand-3 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-sand-11" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[22rem] overflow-hidden border-border p-0 shadow-lg"
      >
        <div className="border-b border-border bg-sand-2 px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-sand-11 transition hover:border-teal-9/30 hover:bg-teal-3 hover:text-teal-12"
              aria-label="الشهر السابق"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="text-center">
              <div className="text-lg font-bold text-teal-12">
                {MONTH_NAMES_AR[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </div>
              <div className="text-xs font-medium text-sand-11">اختيار التاريخ</div>
            </div>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-sand-11 transition hover:border-teal-9/30 hover:bg-teal-3 hover:text-teal-12"
              aria-label="الشهر التالي"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              onChange(today);
              setOpen(false);
            }}
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-sm font-bold transition",
              value === today
                ? "border-teal-9 bg-primary text-primary-foreground"
                : "border-teal-9/20 bg-card/80 text-teal-12 hover:bg-teal-3"
            )}
          >
            اليوم
          </button>
        </div>

        <div className="bg-card px-3 pb-3 pt-2">
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEK_ORDER.map((dow) => (
              <div
                key={dow}
                className="py-1.5 text-center text-[11px] font-bold text-sand-11"
              >
                {DAY_SHORT_AR[dow]}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const dateStr = format(day, "yyyy-MM-dd");
              const isToday = dateStr === today;
              const isSelected = dateStr === value;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => {
                    onChange(dateStr);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative h-10 rounded-xl text-sm font-bold transition-all duration-150",
                    "hover:bg-teal-3 hover:text-teal-12",
                    !inMonth && "text-sand-11/45",
                    inMonth && "text-foreground",
                    isToday &&
                      !isSelected &&
                      "ring-2 ring-inset ring-teal-9/45",
                    isSelected &&
                      "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
