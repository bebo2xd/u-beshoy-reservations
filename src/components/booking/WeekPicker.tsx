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
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DAY_SHORT_AR, WEEK_ORDER } from "@/lib/constants";
import {
  addCalendarDays,
  cairoNoon,
  CAIRO_TZ,
  formatDateAr,
  formatDateShort,
  getWeekStartFriday,
  todayCairo,
} from "@/lib/dates";
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

interface WeekPickerProps {
  weekStart: string;
  onSelectWeek: (friday: string) => void;
  disabled?: boolean;
}

function fridayOf(date: Date) {
  return getWeekStartFriday(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: CAIRO_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date)
  );
}

export function WeekPicker({ weekStart, onSelectWeek, disabled }: WeekPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedNoon = cairoNoon(weekStart);
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedNoon));
  const today = todayCairo();
  const todayFriday = getWeekStartFriday(today);
  const weekEnd = addCalendarDays(weekStart, 6);

  const days = useMemo(() => {
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
  }, [viewMonth]);

  function pickDay(day: Date) {
    onSelectWeek(fridayOf(day));
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setViewMonth(startOfMonth(cairoNoon(weekStart)));
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="اختيار أسبوع من التقويم"
          className={cn(
            "group flex h-12 min-w-0 sm:min-w-[15.5rem] items-center gap-2.5 rounded-2xl px-4 text-right",
            "border border-border bg-card text-base font-bold shadow-sm",
            "transition-colors duration-200",
            "hover:border-teal-9/40 hover:bg-sand-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            "active:scale-[0.99]"
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-3 text-teal-11">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-[11px] font-semibold tracking-wide text-sand-11">
              اختيار الأسبوع
            </span>
            <span className="truncate text-foreground sm:hidden">
              أسبوع {formatDateShort(weekStart)}
            </span>
            <span className="hidden truncate text-foreground sm:inline">
              أسبوع {formatDateAr(weekStart)}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-sand-11" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
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
              <div className="text-xs font-medium text-sand-11">
                أسبوع الكنيسة: جمعة → خميس
              </div>
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
              onSelectWeek(todayFriday);
              setOpen(false);
            }}
            className={cn(
              "w-full rounded-xl border px-3 py-2 text-sm font-bold transition",
              weekStart === todayFriday
                ? "border-teal-9 bg-primary text-primary-foreground"
                : "border-teal-9/20 bg-card/80 text-teal-12 hover:bg-teal-3"
            )}
          >
            الأسبوع الحالي
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
              const inSelectedWeek =
                dateStr >= weekStart && dateStr <= weekEnd;
              const isWeekStart = dateStr === weekStart;
              const isWeekEnd = dateStr === weekEnd;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={cn(
                    "relative h-10 rounded-xl text-sm font-bold transition-all duration-150",
                    "hover:bg-teal-3 hover:text-teal-12",
                    !inMonth && "text-sand-11/50",
                    inMonth && "text-foreground",
                    inSelectedWeek &&
                      inMonth &&
                      "bg-teal-3 text-teal-12 hover:bg-teal-3",
                    isWeekStart && inSelectedWeek && "rounded-s-xl rounded-e-md",
                    isWeekEnd && inSelectedWeek && "rounded-e-xl rounded-s-md",
                    isToday &&
                      !inSelectedWeek &&
                      "ring-2 ring-inset ring-teal-9/50",
                    isToday &&
                      inSelectedWeek &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          <p className="mt-2 px-1 text-center text-[11px] font-medium text-sand-11">
            اختار أي يوم — هنفتح أسبوعه كامل
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
