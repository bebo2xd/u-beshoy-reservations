import { addDays, addWeeks } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import {
  DAY_NAMES_AR,
  DAY_SHORT_AR,
  WEEK_ORDER,
  DEFAULT_OPEN_HOUR,
  DEFAULT_CLOSE_HOUR,
} from "@/lib/constants";
import type { WeekDay } from "@/lib/types";

export const CAIRO_TZ = "Africa/Cairo";

const WEEKDAY_SHORT_TO_JS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Force Node process timezone when possible (server/runtime). */
export function ensureCairoTimezone() {
  if (typeof process !== "undefined" && process.env.TZ !== CAIRO_TZ) {
    process.env.TZ = CAIRO_TZ;
  }
}

ensureCairoTimezone();

/** Today's calendar date in Cairo as YYYY-MM-DD */
export function todayCairo(): string {
  return formatDateInCairo(new Date());
}

/** Format an instant as YYYY-MM-DD in Cairo */
export function formatDateInCairo(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Human date-time string in Cairo (ar-EG) */
export function formatDateTimeArCairo(date = new Date()): string {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: CAIRO_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * UTC instant corresponding to noon on a Cairo calendar date.
 * Safe base for day-of-week / add-days without depending on server local TZ.
 */
export function cairoNoon(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T12:00:00`, CAIRO_TZ);
}

/** JS weekday 0=Sun … 6=Sat for a YYYY-MM-DD in Cairo */
export function dayOfWeekCairo(dateStr: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    weekday: "short",
  }).format(cairoNoon(dateStr));
  return WEEKDAY_SHORT_TO_JS[weekday] ?? 0;
}

/** Add calendar days to a YYYY-MM-DD string (Cairo) */
export function addCalendarDays(dateStr: string, delta: number): string {
  return formatDateInCairo(addDays(cairoNoon(dateStr), delta));
}

/**
 * Get the Friday that starts the church week containing `dateStr`.
 * Week runs Friday → Thursday.
 */
export function getWeekStartFriday(dateStr?: string): string {
  const date = dateStr ?? todayCairo();
  const daysFromFriday = (dayOfWeekCairo(date) - 5 + 7) % 7;
  return addCalendarDays(date, -daysFromFriday);
}

export function buildWeekDays(weekStartFriday: string): WeekDay[] {
  return WEEK_ORDER.map((_, i) => {
    const date = addCalendarDays(weekStartFriday, i);
    const dayOfWeek = dayOfWeekCairo(date);
    return {
      date,
      dayOfWeek,
      label: DAY_NAMES_AR[dayOfWeek],
      shortLabel: DAY_SHORT_AR[dayOfWeek],
    };
  });
}

export function formatDateAr(dateStr: string): string {
  const day = DAY_NAMES_AR[dayOfWeekCairo(dateStr)];
  const [y, m, d] = dateStr.split("-");
  return `${day} ${Number(d)}/${Number(m)}/${y}`;
}

/** Short date without weekday: d/M/yyyy */
export function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${Number(d)}/${Number(m)}/${y}`;
}

export function hourRange(
  open = DEFAULT_OPEN_HOUR,
  close = DEFAULT_CLOSE_HOUR
): number[] {
  const hours: number[] = [];
  for (let h = open; h < close; h++) hours.push(h);
  return hours;
}

export function maxBookableDate(maxWeeksAhead: number): string {
  return formatDateInCairo(
    addWeeks(cairoNoon(todayCairo()), maxWeeksAhead)
  );
}

/** Build a timestamptz range in Cairo for exclusion constraint helpers */
export function cairoRange(date: string, startHour: number, endHour: number) {
  const start = fromZonedTime(
    `${date}T${String(startHour).padStart(2, "0")}:00:00`,
    CAIRO_TZ
  );
  const end = fromZonedTime(
    `${date}T${String(endHour).padStart(2, "0")}:00:00`,
    CAIRO_TZ
  );
  return { start, end };
}

export function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** @deprecated use todayCairo / cairoNoon — kept for callers expecting a Date in Cairo wall time */
export function cairoNow(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return fromZonedTime(
    `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`,
    CAIRO_TZ
  );
}
