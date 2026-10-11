import { createClient } from "@/lib/supabase/server";
import { buildOccupancy, hiddenBookingDates, type AvailabilityInput } from "@/lib/availability";
import { buildWeekDays, getWeekStartFriday, todayCairo } from "@/lib/dates";
import {
  DEFAULT_CLOSE_HOUR,
  DEFAULT_IMPORTANT_NOTES,
  DEFAULT_OPEN_HOUR,
} from "@/lib/constants";
import type {
  AppSettings,
  Blackout,
  Booking,
  BookingListStatus,
  OccupancyBlock,
  RecurringSchedule,
  Room,
  ScheduleException,
} from "@/lib/types";
import { DEFAULT_UI_FONT, resolveUiFont } from "@/lib/ui-fonts";

const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  open_hour: DEFAULT_OPEN_HOUR,
  close_hour: DEFAULT_CLOSE_HOUR,
  slot_duration_minutes: 60,
  week_start_day: 5,
  max_weeks_ahead: 4,
  important_notes: DEFAULT_IMPORTANT_NOTES,
  site_title: "حجوزات الكنيسة",
  ui_font: DEFAULT_UI_FONT,
  notification_prefs: undefined,
  evolution_url: null,
  evolution_api_key: null,
  evolution_instance: null,
  admin_whatsapp: null,
  notify_admin_ids: null,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
    return {
      ...DEFAULT_SETTINGS,
      ...(data as AppSettings),
      ui_font: resolveUiFont((data as AppSettings | null)?.ui_font),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getActiveRooms(): Promise<Room[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order");
    return (data as Room[]) ?? [];
  } catch {
    return [];
  }
}

export async function getAllRooms(): Promise<Room[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("rooms").select("*").order("sort_order");
  return (data as Room[]) ?? [];
}

export async function getWeekScheduleData(
  weekStart?: string,
  options?: { hideClosedDays?: boolean }
) {
  const friday = weekStart ?? getWeekStartFriday(todayCairo());
  const allDays = buildWeekDays(friday);
  const dates = allDays.map((d) => d.date);
  const from = dates[0];
  const to = dates[dates.length - 1];

  const supabase = await createClient();

  const [settings, roomsRes, schedulesRes, exceptionsRes, blackoutsRes, bookingsRes] =
    await Promise.all([
      getSettings(),
      supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order"),
      supabase
        .from("recurring_schedules")
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order"),
      supabase
        .from("schedule_exceptions")
        .select("*")
        .gte("exception_date", from)
        .lte("exception_date", to),
      // Ranges may start before the week — fetch broadly then filter
      supabase.from("blackouts").select("*").lte("date", to),
      supabase.rpc("get_public_bookings", { p_from: from, p_to: to }),
    ]);

  const rooms = (roomsRes.data as Room[]) ?? [];
  const schedules = (schedulesRes.data as RecurringSchedule[]) ?? [];
  const exceptions = (exceptionsRes.data as ScheduleException[]) ?? [];
  const blackouts = ((blackoutsRes.data as Blackout[]) ?? []).filter((b) => {
    const end = b.end_date || b.date;
    return end >= from;
  });
  const bookings = (bookingsRes.data ?? []) as AvailabilityInput["bookings"];

  const hideClosed = options?.hideClosedDays !== false;
  const hidden = hideClosed ? hiddenBookingDates(blackouts) : new Set<string>();
  const days = hideClosed
    ? allDays.filter((d) => !hidden.has(d.date))
    : allDays;
  const activeDates = days.map((d) => d.date);

  const occupancy: OccupancyBlock[] = buildOccupancy({
    rooms,
    schedules,
    exceptions,
    blackouts,
    bookings,
    dates: activeDates.length ? activeDates : dates,
    settings,
  });

  return { friday, days, rooms, schedules, occupancy, settings, blackouts, bookings };
}

export async function getPendingBookings(): Promise<Booking[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("*, rooms(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data as Booking[]) ?? [];
}

export async function getRecentBookings(limit = 50): Promise<Booking[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("*, rooms(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Booking[]) ?? [];
}

const BOOKING_PAGE_SIZES = [10, 20, 50, 100] as const;

export type { BookingListStatus };

export function normalizeBookingPageSize(value?: number | string): number {
  const n = Number(value);
  return (BOOKING_PAGE_SIZES as readonly number[]).includes(n) ? n : 20;
}

/** Server-side search / filter / pagination for admin booking history. */
export async function listBookingsPage(opts: {
  q?: string;
  status?: BookingListStatus;
  roomId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: Booking[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const pageSize = normalizeBookingPageSize(opts.pageSize);
  const page = Math.max(1, Number(opts.page) || 1);
  const status = opts.status ?? "all";
  const roomId = opts.roomId?.trim() || "";
  const q = (opts.q ?? "")
    .replace(/[%_,."'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select("*, rooms(*)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (roomId) {
    query = query.eq("room_id", roomId);
  }
  if (q) {
    const pattern = `"%${q}%"`;
    query = query.or(
      [
        `service_name.ilike.${pattern}`,
        `requester_name.ilike.${pattern}`,
        `requester_phone.ilike.${pattern}`,
        `tracking_code.ilike.${pattern}`,
      ].join(",")
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("listBookingsPage", error);
    return { items: [], total: 0, page, pageSize };
  }

  return {
    items: (data as Booking[]) ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getSchedulesWithRooms() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recurring_schedules")
    .select("*, rooms(name, color)")
    .order("sort_order");
  return (data as Array<
    RecurringSchedule & { rooms: { name: string; color: string } | null }
  >) ?? [];
}

export async function getBlackouts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blackouts")
    .select("*, rooms(name)")
    .order("date", { ascending: false });
  return data ?? [];
}
