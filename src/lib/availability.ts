import type {
  AppSettings,
  Blackout,
  Booking,
  OccupancyBlock,
  RecurringSchedule,
  Room,
  ScheduleException,
} from "@/lib/types";
import { addCalendarDays, overlaps } from "@/lib/dates";
import {
  DEFAULT_CLOSE_HOUR,
  DEFAULT_OPEN_HOUR,
  DEFAULT_SLOT_DURATION_MINUTES,
  normalizeHour,
  slotStepHours,
} from "@/lib/constants";

/** Expand blackout into each YYYY-MM-DD it covers */
export function blackoutDateRange(bl: Pick<Blackout, "date" | "end_date">): string[] {
  const end = bl.end_date || bl.date;
  if (end < bl.date) return [bl.date];
  const dates: string[] = [];
  let cur = bl.date;
  while (cur <= end) {
    dates.push(cur);
    cur = addCalendarDays(cur, 1);
  }
  return dates;
}

/** Dates that should be hidden from the public booking calendar */
export function hiddenBookingDates(blackouts: Blackout[]): Set<string> {
  const set = new Set<string>();
  for (const bl of blackouts) {
    if (!bl.hide_day) continue;
    for (const d of blackoutDateRange(bl)) set.add(d);
  }
  return set;
}

export interface AvailabilityInput {
  rooms: Room[];
  schedules: RecurringSchedule[];
  exceptions: ScheduleException[];
  blackouts: Blackout[];
  bookings: Pick<
    Booking,
    "id" | "room_id" | "booking_date" | "start_hour" | "end_hour" | "service_name" | "status"
  >[];
  dates: string[]; // YYYY-MM-DD within the week
  settings?: Pick<AppSettings, "open_hour" | "close_hour" | "slot_duration_minutes">;
}

function dayOfWeekFromDate(dateStr: string): number {
  // Parse as UTC noon to avoid TZ shift issues for calendar dates
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

export function buildOccupancy(input: AvailabilityInput): OccupancyBlock[] {
  const blocks: OccupancyBlock[] = [];
  const roomMap = new Map(input.rooms.map((r) => [r.id, r]));
  const exceptionSet = new Set(
    input.exceptions.map((e) => `${e.recurring_schedule_id}|${e.exception_date}`)
  );

  for (const date of input.dates) {
    const dow = dayOfWeekFromDate(date);

    for (const rs of input.schedules) {
      if (!rs.is_active) continue;
      if (rs.day_of_week !== dow) continue;
      if (rs.valid_from && date < rs.valid_from) continue;
      if (rs.valid_until && date > rs.valid_until) continue;
      if (exceptionSet.has(`${rs.id}|${date}`)) continue;
      const room = roomMap.get(rs.room_id);
      if (!room?.is_active) continue;

      blocks.push({
        room_id: rs.room_id,
        date,
        start_hour: normalizeHour(Number(rs.start_hour)),
        end_hour: normalizeHour(Number(rs.end_hour)),
        title: rs.title,
        kind: "recurring",
        color: room.color,
        schedule_id: rs.id,
        needs_review: rs.needs_review,
      });
    }

    for (const bl of input.blackouts) {
      const rangeEnd = bl.end_date || bl.date;
      if (date < bl.date || date > rangeEnd) continue;
      if (bl.room_id) {
        blocks.push({
          room_id: bl.room_id,
          date,
          start_hour: normalizeHour(Number(bl.start_hour)),
          end_hour: normalizeHour(Number(bl.end_hour)),
          title: bl.reason,
          kind: "blackout",
          color: "#8D8D86",
        });
      } else {
        for (const room of input.rooms.filter((r) => r.is_active)) {
          blocks.push({
            room_id: room.id,
            date,
            start_hour: normalizeHour(Number(bl.start_hour)),
            end_hour: normalizeHour(Number(bl.end_hour)),
            title: bl.reason,
            kind: "blackout",
            color: "#8D8D86",
          });
        }
      }
    }

    for (const b of input.bookings) {
      if (b.booking_date !== date) continue;
      if (b.status !== "pending" && b.status !== "approved") continue;
      const room = roomMap.get(b.room_id);
      blocks.push({
        room_id: b.room_id,
        date,
        start_hour: normalizeHour(Number(b.start_hour)),
        end_hour: normalizeHour(Number(b.end_hour)),
        title: b.status === "pending" ? "طلب قيد المراجعة" : b.service_name,
        kind: b.status === "pending" ? "pending" : "booking",
        color: b.status === "pending" ? "#FFB224" : room?.color,
        booking_id: b.id,
        status: b.status,
      });
    }
  }

  return blocks;
}

export function isSlotFree(
  blocks: OccupancyBlock[],
  roomId: string,
  date: string,
  startHour: number,
  endHour: number
): boolean {
  return !blocks.some(
    (b) =>
      b.room_id === roomId &&
      b.date === date &&
      overlaps(startHour, endHour, b.start_hour, b.end_hour)
  );
}

export function getBlocksForSlot(
  blocks: OccupancyBlock[],
  roomId: string,
  date: string,
  hour: number
): OccupancyBlock[] {
  return blocks.filter(
    (b) =>
      b.room_id === roomId &&
      b.date === date &&
      hour >= b.start_hour &&
      hour < b.end_hour
  );
}

export function hoursList(
  settings?: Pick<AppSettings, "open_hour" | "close_hour" | "slot_duration_minutes">
): number[] {
  const open = settings?.open_hour ?? DEFAULT_OPEN_HOUR;
  const close = settings?.close_hour ?? DEFAULT_CLOSE_HOUR;
  const step = slotStepHours(
    settings?.slot_duration_minutes ?? DEFAULT_SLOT_DURATION_MINUTES
  );
  const hours: number[] = [];
  for (let h = open; h < close - 1e-9; h += step) {
    hours.push(normalizeHour(h));
  }
  return hours;
}

/** Expand contiguous selected slots into start/end */
export function selectionFromHours(
  hours: number[],
  step = 1
): { start: number; end: number } | null {
  if (hours.length === 0) return null;
  const sorted = [...hours].map(normalizeHour).sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i] - sorted[i - 1] - step) > 1e-9) return null;
  }
  return {
    start: sorted[0],
    end: normalizeHour(sorted[sorted.length - 1] + step),
  };
}
