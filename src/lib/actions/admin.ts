"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false as const, error: "بيانات الدخول غير صحيحة" };
  }
  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function upsertRoom(form: {
  id?: string;
  name: string;
  floor?: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}) {
  const supabase = await requireAdmin();
  if (form.id) {
    const { error } = await supabase
      .from("rooms")
      .update({
        name: form.name,
        floor: form.floor || null,
        color: form.color,
        sort_order: form.sort_order,
        is_active: form.is_active,
      })
      .eq("id", form.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from("rooms").insert({
      name: form.name,
      floor: form.floor || null,
      color: form.color,
      sort_order: form.sort_order,
      is_active: form.is_active,
    });
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath("/admin/rooms");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function deleteRoom(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("rooms").update({ is_active: false }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/rooms");
  return { ok: true as const };
}

export async function upsertSchedule(form: {
  id?: string;
  room_id: string;
  day_of_week: number;
  start_hour: number;
  end_hour: number;
  title: string;
  notes?: string;
  needs_review: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: boolean;
}) {
  const supabase = await requireAdmin();
  const payload = {
    room_id: form.room_id,
    day_of_week: form.day_of_week,
    start_hour: form.start_hour,
    end_hour: form.end_hour,
    title: form.title,
    notes: form.notes || null,
    needs_review: form.needs_review,
    valid_from: form.valid_from || null,
    valid_until: form.valid_until || null,
    is_active: form.is_active,
  };
  if (form.id) {
    const { error } = await supabase
      .from("recurring_schedules")
      .update(payload)
      .eq("id", form.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from("recurring_schedules").insert(payload);
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath("/admin/schedules");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function deleteSchedule(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("recurring_schedules")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/schedules");
  return { ok: true as const };
}

export async function addException(scheduleId: string, date: string, reason?: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("schedule_exceptions").insert({
    recurring_schedule_id: scheduleId,
    exception_date: date,
    reason: reason || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/calendar");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function createBlackout(form: {
  room_id?: string | null;
  date: string;
  start_hour: number;
  end_hour: number;
  reason: string;
}) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("blackouts").insert({
    room_id: form.room_id || null,
    date: form.date,
    start_hour: form.start_hour,
    end_hour: form.end_hour,
    reason: form.reason,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/blackouts");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function createMonthlyServantsMeeting(date: string) {
  return createBlackout({
    room_id: null,
    date,
    start_hour: 19,
    end_hour: 21,
    reason: "اجتماع الخدام الشهري",
  });
}

export async function deleteBlackout(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("blackouts").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/blackouts");
  return { ok: true as const };
}

export async function updateSettings(form: {
  open_hour: number;
  close_hour: number;
  max_weeks_ahead: number;
  important_notes: string;
  site_title: string;
}) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("settings")
    .update({
      open_hour: form.open_hour,
      close_hour: form.close_hour,
      max_weeks_ahead: form.max_weeks_ahead,
      important_notes: form.important_notes,
      site_title: form.site_title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function adminCreateBooking(form: {
  room_id: string;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  service_name: string;
  requester_name: string;
  requester_phone: string;
  notes?: string;
}) {
  const supabase = await requireAdmin();
  const code = Math.random().toString(36).slice(2, 10).toUpperCase();
  const { error } = await supabase.from("bookings").insert({
    ...form,
    notes: form.notes || null,
    status: "approved",
    tracking_code: code,
  });
  if (error) {
    if (error.code === "23P01") {
      return { ok: false as const, error: "الموعد متعارض مع حجز آخر" };
    }
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/admin/calendar");
  revalidatePath("/book");
  return { ok: true as const };
}
