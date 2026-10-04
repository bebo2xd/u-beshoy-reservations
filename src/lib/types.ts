import type { NotificationPrefs } from "@/lib/notify/prefs";
import type { UiFontId } from "@/lib/ui-fonts";

export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled";

export type AppRole = "admin" | "servant";

export type OccupancyKind = "recurring" | "booking" | "blackout" | "pending";

export type { NotificationPrefs };

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  role: AppRole;
  is_active: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Room {
  id: string;
  name: string;
  floor: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_core?: boolean;
  deleted_at?: string | null;
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
  sort_order: number;
  deleted_at?: string | null;
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
  /** Inclusive end of range; null/undefined = single day */
  end_date?: string | null;
  start_hour: number;
  end_hour: number;
  reason: string;
  /** Hide these days from the public booking calendar */
  hide_day?: boolean;
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
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
  rooms?: Room;
}

export interface AppSettings {
  id: number;
  open_hour: number;
  close_hour: number;
  /** 30 or 60 — size of each bookable slot cell */
  slot_duration_minutes?: 30 | 60;
  week_start_day: number;
  max_weeks_ahead: number;
  important_notes: string;
  site_title: string;
  /** Arabic UI typeface used across the app */
  ui_font?: UiFontId;
  notification_prefs?: NotificationPrefs;
  evolution_url?: string | null;
  evolution_api_key?: string | null;
  evolution_instance?: string | null;
  admin_whatsapp?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_secure?: boolean | null;
  smtp_user?: string | null;
  smtp_password?: string | null;
  smtp_from?: string | null;
  admin_email?: string | null;
  /** null/empty = all active admins receive admin notifications */
  notify_admin_ids?: string[] | null;
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
