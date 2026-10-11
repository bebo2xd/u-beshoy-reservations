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
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DAY_NAMES_AR, DAY_SHORT_AR, WEEK_ORDER } from "@/lib/constants";
import {
  addCalendarDays,
  cairoNoon,
  dayOfWeekCairo,
  formatDateAr,
  todayCairo,
} from "@/lib/dates";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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

function monthNameFromDate(dateStr: string): string {
  const month = Number(dateStr.slice(5, 7));
  return MONTH_NAMES_AR[month - 1] ?? "";
}

function dayNumberFromDate(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}

interface BookingDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate: string;
  maxDate: string;
  disabled?: boolean;
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

export function BookingDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
}: BookingDatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = todayCairo();
  const selected = value ? cairoNoon(value) : cairoNoon(today);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));

  const days = useMemo(() => monthGrid(viewMonth), [viewMonth]);
  const isToday = value === today;

  function shiftDay(delta: number) {
    const next = addCalendarDays(value, delta);
    if (next < minDate || next > maxDate) return;
    onChange(next);
  }

  function pick(dateStr: string) {
    if (dateStr < minDate || dateStr > maxDate) return;
    onChange(dateStr);
    setOpen(false);
  }

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-12 w-10 shrink-0 rounded-2xl"
        onClick={() => shiftDay(-1)}
        disabled={disabled || value <= minDate}
        aria-label="اليوم السابق"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setViewMonth(startOfMonth(cairoNoon(value || today)));
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="اختيار التاريخ"
            className={cn(
              "group flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl px-2.5 text-right sm:min-w-[15rem] sm:gap-2.5 sm:px-3",
              "border border-border bg-card shadow-sm",
              "transition-colors duration-200",
              "hover:border-primary/35 hover:bg-sand-2",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:pointer-events-none disabled:opacity-50",
              "active:scale-[0.995]"
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-9 sm:w-9">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground sm:text-[11px]">
                التاريخ
              </span>
              <span className="block truncate text-sm font-bold text-foreground sm:text-[15px]">
                {isToday ? (
                  <>
                    اليوم
                    <span className="mx-1 font-medium text-muted-foreground">·</span>
                    <span className="font-semibold text-muted-foreground">
                      {dayNumberFromDate(value)}{" "}
                      <span className="text-[11px] font-medium sm:text-xs">
                        {monthNameFromDate(value)}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    {DAY_NAMES_AR[dayOfWeekCairo(value)]}{" "}
                    {dayNumberFromDate(value)}{" "}
                    <span className="text-[11px] font-semibold text-muted-foreground sm:text-xs">
                      {monthNameFromDate(value)}
                    </span>
                  </>
                )}
              </span>
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="center"
          className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden border-border p-0 shadow-lg"
        >
          <div className="border-b border-border bg-sand-2 px-4 pb-3 pt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-sand-11 transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                aria-label="الشهر السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {MONTH_NAMES_AR[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  اختَر اليوم مباشرة
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-sand-11 transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                aria-label="الشهر التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => pick(today)}
              disabled={today < minDate || today > maxDate}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-sm font-bold transition",
                value === today
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/20 bg-card text-primary hover:bg-primary/10"
              )}
            >
              اليوم · {formatDateAr(today)}
            </button>
          </div>

          <div className="bg-card px-3 pb-3 pt-2">
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEK_ORDER.map((dow) => (
                <div
                  key={dow}
                  className="py-1.5 text-center text-[11px] font-bold text-muted-foreground"
                >
                  {DAY_SHORT_AR[dow]}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const dateStr = format(day, "yyyy-MM-dd");
                const isDayToday = dateStr === today;
                const isSelected = dateStr === value;
                const outOfRange = dateStr < minDate || dateStr > maxDate;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={outOfRange}
                    onClick={() => pick(dateStr)}
                    className={cn(
                      "relative h-11 rounded-xl text-sm font-bold transition-all duration-150",
                      !outOfRange && "hover:bg-primary/10 hover:text-primary",
                      !inMonth && "text-muted-foreground/45",
                      inMonth && !outOfRange && "text-foreground",
                      outOfRange && "cursor-not-allowed text-muted-foreground/30",
                      isDayToday &&
                        !isSelected &&
                        !outOfRange &&
                        "ring-2 ring-inset ring-primary/45",
                      isSelected &&
                        "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                    {isDayToday && !isSelected ? (
                      <span className="absolute inset-x-0 bottom-1 mx-auto h-1 w-1 rounded-full bg-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-12 w-10 shrink-0 rounded-2xl"
        onClick={() => shiftDay(1)}
        disabled={disabled || value >= maxDate}
        aria-label="اليوم التالي"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
}
