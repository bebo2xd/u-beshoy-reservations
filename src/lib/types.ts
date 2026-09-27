export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export type OccupancyKind = "recurring" | "booking" | "blackout" | "pending";

export interface Room {
  id: string;
  name: string;
  floor: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface RecurringSchedule {
  id: string;
  room_id: string;
  day_of_week: number; // 0=Sun ... 6=Sat (JS getDay)
  start_hour: number;
  end_hour: number;
  title: string;
  notes: string | null;
  needs_review: boolean;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface ScheduleException {
  id: string;
  recurring_schedule_id: string;
  exception_date: string;
  reason: string | null;
}

export interface Blackout {
  id: string;
  room_id: string | null;
  date: string;
  start_hour: number;
  end_hour: number;
  reason: string;
  created_at?: string;
}

export interface Booking {
  id: string;
  room_id: string;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  service_name: string;
  requester_name: string;
  requester_phone: string;
  notes: string | null;
  status: BookingStatus;
  admin_note: string | null;
  tracking_code: string;
  created_at: string;
  updated_at?: string;
  rooms?: Room;
}

export interface AppSettings {
  id: number;
  open_hour: number;
  close_hour: number;
  week_start_day: number;
  max_weeks_ahead: number;
  important_notes: string;
  site_title: string;
}

export interface OccupancyBlock {
  room_id: string;
  date: string;
  start_hour: number;
  end_hour: number;
  title: string;
  kind: OccupancyKind;
  color?: string;
  booking_id?: string;
  schedule_id?: string;
  status?: BookingStatus;
  needs_review?: boolean;
}

export interface SlotSelection {
  roomId: string;
  roomName: string;
  date: string;
  startHour: number;
  endHour: number;
}

export interface WeekDay {
  date: string;
  dayOfWeek: number;
  label: string;
  shortLabel: string;
}
