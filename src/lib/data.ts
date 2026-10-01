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
  OccupancyBlock,
  RecurringSchedule,
  Room,
  ScheduleException,
} from "@/lib/types";

const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  open_hour: DEFAULT_OPEN_HOUR,
  close_hour: DEFAULT_CLOSE_HOUR,
  slot_duration_minutes: 60,
  week_start_day: 5,
  max_weeks_ahead: 4,
  important_notes: DEFAULT_IMPORTANT_NOTES,
  site_title: "حجوزات الكنيسة",
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
    return (data as AppSettings) ?? DEFAULT_SETTINGS;
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
  const settings = await getSettings();

  const [roomsRes, schedulesRes, exceptionsRes, blackoutsRes, bookingsRes] =
    await Promise.all([
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
