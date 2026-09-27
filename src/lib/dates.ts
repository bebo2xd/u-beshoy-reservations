import {
  addDays,
  format,
  parseISO,
  startOfDay,
  addWeeks,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  DAY_NAMES_AR,
  DAY_SHORT_AR,
  WEEK_ORDER,
  DEFAULT_OPEN_HOUR,
  DEFAULT_CLOSE_HOUR,
} from "@/lib/constants";
import type { WeekDay } from "@/lib/types";

export const CAIRO_TZ = "Africa/Cairo";

/** Today's calendar date in Cairo as YYYY-MM-DD */
export function todayCairo(): string {
  const now = toZonedTime(new Date(), CAIRO_TZ);
  return format(now, "yyyy-MM-dd");
}

export function cairoNow(): Date {
  return toZonedTime(new Date(), CAIRO_TZ);
}

/**
 * Get the Friday that starts the church week containing `dateStr`.
 * Week runs Friday → Thursday.
 */
export function getWeekStartFriday(dateStr?: string): string {
  const base = dateStr
    ? toZonedTime(parseISO(dateStr + "T12:00:00"), CAIRO_TZ)
    : cairoNow();
  const day = base.getDay(); // 0 Sun ... 5 Fri 6 Sat
  // Distance back to Friday
  const daysFromFriday = (day - 5 + 7) % 7;
  const friday = addDays(startOfDay(base), -daysFromFriday);
  return format(friday, "yyyy-MM-dd");
}

export function buildWeekDays(weekStartFriday: string): WeekDay[] {
  const start = parseISO(weekStartFriday + "T12:00:00");
  return WEEK_ORDER.map((_, i) => {
    const d = addDays(start, i);
    const date = format(d, "yyyy-MM-dd");
    const dayOfWeek = d.getDay();
    return {
      date,
      dayOfWeek,
      label: DAY_NAMES_AR[dayOfWeek],
      shortLabel: DAY_SHORT_AR[dayOfWeek],
    };
  });
}

export function formatDateAr(dateStr: string): string {
  const d = parseISO(dateStr + "T12:00:00");
  const day = DAY_NAMES_AR[d.getDay()];
  return `${day} ${format(d, "d/M/yyyy")}`;
}

export function hourRange(open = DEFAULT_OPEN_HOUR, close = DEFAULT_CLOSE_HOUR): number[] {
  const hours: number[] = [];
  for (let h = open; h < close; h++) hours.push(h);
  return hours;
}

export function maxBookableDate(maxWeeksAhead: number): string {
  return format(addWeeks(parseISO(todayCairo() + "T12:00:00"), maxWeeksAhead), "yyyy-MM-dd");
}

/** Build a timestamptz range in Cairo for exclusion constraint helpers */
export function cairoRange(date: string, startHour: number, endHour: number) {
  const start = fromZonedTime(`${date}T${String(startHour).padStart(2, "0")}:00:00`, CAIRO_TZ);
  const end = fromZonedTime(`${date}T${String(endHour).padStart(2, "0")}:00:00`, CAIRO_TZ);
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
