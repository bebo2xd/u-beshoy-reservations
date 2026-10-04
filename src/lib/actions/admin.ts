"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, requireAdmin as requireAdminSession, requirePermission } from "@/lib/auth/session";
import type { AppRole } from "@/lib/types";
import { CUSTOM_FLAG, PERMISSION_KEYS } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatDateTimeArCairo } from "@/lib/dates";
import { blackoutDateRange } from "@/lib/availability";

async function requireAdmin() {
  const result = await requireAdminSession();
  if (!result.ok || !result.supabase) {
    throw new Error(result.error ?? "Unauthorized");
  }
  return result.supabase;
}

function safeNext(raw: string, role: AppRole) {
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    if (raw.startsWith("/admin") && role !== "admin") return "/book";
    return raw;
  }
  return role === "admin" ? "/admin" : "/book";
}

function normalizePhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length >= 11) {
    digits = `0${digits.slice(2)}`;
  }
  return digits;
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}

async function resolveLoginEmail(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (looksLikeEmail(trimmed)) {
    return trimmed.toLowerCase();
  }

  const phone = normalizePhone(trimmed);
  if (phone.length < 10) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email, phone")
    .is("deleted_at", null)
    .eq("is_active", true);

  const match = (data ?? []).find((row) => {
    const stored = normalizePhone(row.phone || "");
    if (!stored) return false;
    return (
      stored === phone ||
      stored.endsWith(phone.slice(-10)) ||
      phone.endsWith(stored.slice(-10))
    );
  });

  return match?.email?.toLowerCase() ?? null;
}

export async function loginAction(formData: FormData) {
  const identifier = String(
    formData.get("identifier") ?? formData.get("email") ?? ""
  ).trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  let email: string | null = null;
  try {
    email = await resolveLoginEmail(identifier);
  } catch (e) {
    console.error("resolveLoginEmail failed", e);
    return { ok: false as const, error: "تعذر التحقق من بيانات الدخول" };
  }

  if (!email) {
    return {
      ok: false as const,
      error: "لم يتم العثور على حساب بهذا الإيميل أو رقم التليفون",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false as const, error: "بيانات الدخول غير صحيحة" };
  }

  const profile = await getProfile();
  if (!profile) {
    await supabase.auth.signOut();
    return {
      ok: false as const,
      error: "الحساب غير مفعّل أو محذوف. تواصل مع الإدارة",
    };
  }

  const { data: canAdmin } = await supabase.rpc("is_admin");
  const dest = safeNext(next, canAdmin === true ? "admin" : "servant");
  redirect(dest);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateOwnProfile(form: {
  full_name: string;
  phone: string;
  email: string;
  password?: string;
}) {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false as const, error: "يجب تسجيل الدخول" };
  }

  const full_name = form.full_name.trim();
  const email = form.email.trim().toLowerCase();
  const phone = form.phone.replace(/\D/g, "");

  if (full_name.length < 2) {
    return { ok: false as const, error: "الاسم مطلوب" };
  }
  if (!email.includes("@")) {
    return { ok: false as const, error: "البريد غير صحيح" };
  }
  if (phone.length < 10) {
    return { ok: false as const, error: "رقم التليفون غير صحيح" };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name, phone, email })
    .eq("id", profile.id);

  if (profileError) {
    // Fallback via service role if RLS blocks email-only changes oddly
    try {
      const admin = createAdminClient();
      const { error } = await admin
        .from("profiles")
        .update({ full_name, phone, email })
        .eq("id", profile.id);
      if (error) return { ok: false as const, error: error.message };
    } catch {
      return { ok: false as const, error: profileError.message };
    }
  }

  const authUpdate: {
    email?: string;
    password?: string;
    user_metadata?: object;
  } = {
    email,
    user_metadata: { full_name },
  };
  if (form.password && form.password.length >= 6) {
    authUpdate.password = form.password;
  }

  try {
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.updateUserById(
      profile.id,
      authUpdate
    );
    if (authError) return { ok: false as const, error: authError.message };
  } catch (e) {
    console.error(e);
    return { ok: false as const, error: "تعذر تحديث بيانات الدخول" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/account");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function upsertRoom(form: {
  id?: string;
  name: string;
  floor?: string;
  color: string;
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
        is_active: form.is_active,
      })
      .eq("id", form.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { data: maxRow } = await supabase
      .from("rooms")
      .select("sort_order")
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sort_order = (maxRow?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("rooms").insert({
      name: form.name,
      floor: form.floor || null,
      color: form.color,
      sort_order,
      is_active: form.is_active,
    });
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath("/admin/rooms");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function softDeleteRoom(id: string) {
  const supabase = await requireAdmin();
  const { data: room } = await supabase
    .from("rooms")
    .select("is_core, name")
    .eq("id", id)
    .maybeSingle();
  if (room?.is_core) {
    return {
      ok: false as const,
      error: "الأماكن الأساسية مش قابلة للحذف — وقّفها من التعديل لو حابب تخفيها",
    };
  }
  const { error } = await supabase
    .from("rooms")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/rooms");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function restoreRoom(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("rooms")
    .update({ deleted_at: null, is_active: true })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/rooms");
  revalidatePath("/book");
  return { ok: true as const };
}

/** @deprecated use softDeleteRoom */
export async function deleteRoom(id: string) {
  return softDeleteRoom(id);
}

export async function reorderRooms(orderedIds: string[]) {
  const supabase = await requireAdmin();
  const updates = orderedIds.map((id, index) =>
    supabase.from("rooms").update({ sort_order: index + 1 }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false as const, error: failed.error.message };
  revalidatePath("/admin/rooms");
  revalidatePath("/book");
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
    const { data: maxRow } = await supabase
      .from("recurring_schedules")
      .select("sort_order")
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("recurring_schedules").insert({
      ...payload,
      sort_order: (maxRow?.sort_order ?? 0) + 1,
    });
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath("/admin/schedules");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function softDeleteSchedule(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("recurring_schedules")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/schedules");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function restoreSchedule(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("recurring_schedules")
    .update({ deleted_at: null, is_active: true })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/schedules");
  revalidatePath("/book");
  return { ok: true as const };
}

/** @deprecated use softDeleteSchedule */
export async function deleteSchedule(id: string) {
  return softDeleteSchedule(id);
}

export async function reorderSchedules(orderedIds: string[]) {
  const supabase = await requireAdmin();
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("recurring_schedules")
      .update({ sort_order: index + 1 })
      .eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false as const, error: failed.error.message };
  revalidatePath("/admin/schedules");
  revalidatePath("/book");
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

function isMissingDbColumn(message: string | undefined, column: string) {
  if (!message) return false;
  return (
    message.includes(column) &&
    /schema cache|Could not find|column/i.test(message)
  );
}

async function blackoutsHaveRangeColumns(
  supabase: Awaited<ReturnType<typeof requireAdmin>>
) {
  const { error } = await supabase.from("blackouts").select("end_date").limit(1);
  return !error;
}

export async function createBlackout(form: {
  room_id?: string | null;
  date: string;
  end_date?: string | null;
  start_hour: number;
  end_hour: number;
  reason: string;
  hide_day?: boolean;
}) {
  const supabase = await requireAdmin();
  if (form.end_date && form.end_date < form.date) {
    return { ok: false as const, error: "تاريخ النهاية قبل البداية" };
  }
  if (form.end_hour <= form.start_hour) {
    return { ok: false as const, error: "ساعة النهاية لازم تكون بعد البداية" };
  }

  const endDate =
    form.end_date && form.end_date !== form.date ? form.end_date : null;
  const hideDay = Boolean(form.hide_day);
  const base = {
    room_id: form.room_id || null,
    date: form.date,
    start_hour: form.start_hour,
    end_hour: form.end_hour,
    reason: form.reason,
  };

  const hasRangeCols = await blackoutsHaveRangeColumns(supabase);

  const { error } = hasRangeCols
    ? await supabase.from("blackouts").insert({
        ...base,
        ...(endDate ? { end_date: endDate } : {}),
        ...(hideDay ? { hide_day: true } : {}),
      })
    : await supabase.from("blackouts").insert(
        blackoutDateRange({ date: form.date, end_date: endDate }).map((date) => ({
          ...base,
          date,
        }))
      );

  if (
    error &&
    (isMissingDbColumn(error.message, "end_date") ||
      isMissingDbColumn(error.message, "hide_day"))
  ) {
    const { error: retryError } = await supabase.from("blackouts").insert(
      blackoutDateRange({ date: form.date, end_date: endDate }).map((date) => ({
        ...base,
        date,
      }))
    );
    if (retryError) return { ok: false as const, error: retryError.message };
  } else if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/blackouts");
  revalidatePath("/book");
  revalidatePath("/admin/calendar");
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
  week_start_day?: number;
  slot_duration_minutes?: 30 | 60;
}) {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "غير مصرح" };
  }

  const payload: Record<string, unknown> = {
    open_hour: form.open_hour,
    close_hour: form.close_hour,
    max_weeks_ahead: form.max_weeks_ahead,
    important_notes: form.important_notes,
    site_title: form.site_title,
    updated_at: new Date().toISOString(),
  };
  if (form.week_start_day != null) payload.week_start_day = form.week_start_day;
  if (form.slot_duration_minutes != null) {
    payload.slot_duration_minutes = form.slot_duration_minutes;
  }

  let { error } = await auth.supabase.from("settings").update(payload).eq("id", 1);

  // Column not migrated yet — save the rest and warn
  if (
    error &&
    form.slot_duration_minutes != null &&
    /slot_duration_minutes/i.test(error.message)
  ) {
    delete payload.slot_duration_minutes;
    const retry = await auth.supabase.from("settings").update(payload).eq("id", 1);
    error = retry.error;
    if (!error) {
      revalidatePath("/admin/settings");
      revalidatePath("/book");
      return {
        ok: false as const,
        error:
          "باقي الإعدادات اتحفظت، لكن لازم تشغّل migration 0010 في Supabase عشان مدة الفترة (نصف ساعة)",
      };
    }
  }

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function updateNotificationPrefsAction(
  prefs: import("@/lib/notify/prefs").NotificationPrefs,
  notifyAdminIds?: string[] | null
) {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const admin = createAdminClient();

  const patch: Record<string, unknown> = {
    notification_prefs: prefs,
    updated_at: new Date().toISOString(),
  };

  if (notifyAdminIds !== undefined) {
    const cleaned = [
      ...new Set(
        (notifyAdminIds ?? [])
          .map((id) => id.trim())
          .filter(Boolean)
      ),
    ];
    // null = all active admins (including ones added later)
    patch.notify_admin_ids = cleaned.length > 0 ? cleaned : null;
  }

  const { error } = await admin.from("settings").update(patch).eq("id", 1);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function updateSmtpSettingsAction(form: {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  admin_email: string;
  keep_password?: boolean;
}) {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const admin = createAdminClient();

  const patch: Record<string, string | number | boolean | null> = {
    smtp_host: form.smtp_host.trim() || null,
    smtp_port: form.smtp_port > 0 ? form.smtp_port : 587,
    smtp_secure: Boolean(form.smtp_secure),
    smtp_user: form.smtp_user.trim() || null,
    smtp_from: form.smtp_from.trim() || null,
    admin_email: form.admin_email.trim().toLowerCase() || null,
    updated_at: new Date().toISOString(),
  };

  if (!form.keep_password) {
    patch.smtp_password = form.smtp_password.trim() || null;
  } else if (form.smtp_password.trim()) {
    patch.smtp_password = form.smtp_password.trim();
  }

  const { error } = await admin.from("settings").update(patch).eq("id", 1);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function testSmtpAction() {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const { sendTestSmtpEmail } = await import("@/lib/notify/email");
  return sendTestSmtpEmail();
}

export async function updateEvolutionSettingsAction(form: {
  evolution_url: string;
  evolution_api_key: string;
  evolution_instance: string;
  admin_whatsapp: string;
  keep_api_key?: boolean;
}) {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const admin = createAdminClient();

  const patch: Record<string, string | null> = {
    evolution_url: form.evolution_url.trim() || null,
    evolution_instance: form.evolution_instance.trim() || null,
    admin_whatsapp: form.admin_whatsapp.replace(/\D/g, "") || null,
    updated_at: new Date().toISOString(),
  };

  if (!form.keep_api_key) {
    patch.evolution_api_key = form.evolution_api_key.trim() || null;
  } else if (form.evolution_api_key.trim()) {
    patch.evolution_api_key = form.evolution_api_key.trim();
  }

  const { error } = await admin.from("settings").update(patch).eq("id", 1);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function evolutionStatusAction() {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok) return { ok: false as const, error: auth.error, state: "denied" };
  const {
    evolutionConnectionState,
  } = await import("@/lib/evolution/client");
  return evolutionConnectionState();
}

export async function evolutionQrAction() {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const { evolutionFetchQr } = await import("@/lib/evolution/client");
  return evolutionFetchQr();
}

export async function evolutionLogoutAction() {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const { evolutionLogoutInstance } = await import("@/lib/evolution/client");
  return evolutionLogoutInstance();
}

export async function evolutionTestSendAction(phone?: string) {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const {
    evolutionSendText,
    getEvolutionConfig,
  } = await import("@/lib/evolution/client");
  const config = await getEvolutionConfig();
  const target = (phone || config?.adminWhatsapp || "").trim();
  if (!target) {
    return { ok: false as const, error: "حدد رقم واتساب للإرسال التجريبي" };
  }
  return evolutionSendText(
    target,
    `✅ اختبار اتصال Evolution من نظام حجز الغرف\n${formatDateTimeArCairo()}`
  );
}

export async function evolutionCreateInstanceAction(instanceName: string) {
  const auth = await requirePermission("manage_settings");
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const name = instanceName.trim();
  if (!name) return { ok: false as const, error: "اسم الـ Instance مطلوب" };
  const { evolutionCreateInstance } = await import("@/lib/evolution/client");
  const res = await evolutionCreateInstance(name);
  if (res.ok) {
    const admin = createAdminClient();
    await admin
      .from("settings")
      .update({
        evolution_instance: name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    revalidatePath("/admin/settings");
  }
  return res;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const code = Math.random().toString(36).slice(2, 10).toUpperCase();
  const { error } = await supabase.from("bookings").insert({
    ...form,
    notes: form.notes || null,
    status: "approved",
    tracking_code: code,
    created_by: user?.id ?? null,
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

export async function upsertServant(form: {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  role: AppRole;
  is_active: boolean;
  password?: string;
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const email = form.email.trim().toLowerCase();
  const full_name = form.full_name.trim();
  const phone = form.phone.replace(/\D/g, "");

  if (full_name.length < 2) {
    return { ok: false as const, error: "الاسم مطلوب" };
  }
  if (!email.includes("@")) {
    return { ok: false as const, error: "البريد غير صحيح" };
  }
  if (phone.length < 10) {
    return { ok: false as const, error: "رقم التليفون غير صحيح" };
  }

  if (form.id) {
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name,
        phone,
        email,
        role: form.role,
        is_active: form.is_active,
      })
      .eq("id", form.id);
    if (profileError) return { ok: false as const, error: profileError.message };

    const authUpdate: {
      email?: string;
      password?: string;
      user_metadata?: object;
    } = {
      email,
      user_metadata: { full_name },
    };
    if (form.password && form.password.length >= 6) {
      authUpdate.password = form.password;
    }
    const { error: authError } = await admin.auth.admin.updateUserById(
      form.id,
      authUpdate
    );
    if (authError) return { ok: false as const, error: authError.message };
  } else {
    if (!form.password || form.password.length < 6) {
      return {
        ok: false as const,
        error: "كلمة المرور مطلوبة (6 أحرف على الأقل)",
      };
    }
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: form.password,
        email_confirm: true,
        user_metadata: { full_name },
      });
    if (createError || !created.user) {
      return {
        ok: false as const,
        error: createError?.message ?? "تعذر إنشاء الحساب",
      };
    }
    const { error: profileError } = await admin.from("profiles").upsert({
      id: created.user.id,
      full_name,
      phone,
      email,
      role: form.role,
      is_active: form.is_active,
      deleted_at: null,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return { ok: false as const, error: profileError.message };
    }
  }

  revalidatePath("/admin/servants");
  return { ok: true as const };
}

export async function softDeleteServant(id: string) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === id) {
    return { ok: false as const, error: "لا يمكن حذف حسابك الحالي" };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/servants");
  return { ok: true as const };
}

export async function restoreServant(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ deleted_at: null, is_active: true })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/servants");
  return { ok: true as const };
}

export async function getRolePermissionsAction(role: AppRole) {
  const auth = await requirePermission("manage_permissions");
  if (!auth.ok) return { ok: false as const, error: auth.error, permissions: [] as string[] };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("role_permissions")
    .select("permission")
    .eq("role", role);
  if (error) return { ok: false as const, error: error.message, permissions: [] };
  return {
    ok: true as const,
    permissions: (data ?? []).map((r) => r.permission),
  };
}

export async function saveRolePermissionsAction(
  role: AppRole,
  permissions: string[]
) {
  const auth = await requirePermission("manage_permissions");
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const allowed = new Set(PERMISSION_KEYS);
  const next = Array.from(
    new Set(permissions.filter((p) => allowed.has(p as (typeof PERMISSION_KEYS)[number])))
  );

  if (role === "admin" && !next.includes("manage_permissions")) {
    next.push("manage_permissions");
  }
  if (next.some((p) => p !== "book" && p !== "view_own_bookings") && !next.includes("access_admin")) {
    // panel features need access_admin
    const panelKeys = next.filter(
      (p) => p !== "book" && p !== "view_own_bookings"
    );
    if (panelKeys.length) next.push("access_admin");
  }

  const admin = createAdminClient();
  const { error: delError } = await admin
    .from("role_permissions")
    .delete()
    .eq("role", role);
  if (delError) return { ok: false as const, error: delError.message };

  if (next.length) {
    const { error } = await admin.from("role_permissions").insert(
      next.map((permission) => ({ role, permission }))
    );
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/admin/permissions");
  revalidatePath("/admin/servants");
  return { ok: true as const };
}

export async function getProfilePermissionsState(profileId: string) {
  const auth = await requirePermission("manage_permissions");
  if (!auth.ok) {
    const fallback = await requirePermission("manage_servants");
    if (!fallback.ok) {
      return {
        ok: false as const,
        error: fallback.error,
        custom: false,
        permissions: [] as string[],
      };
    }
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .maybeSingle();
  const role = (profile?.role as AppRole) ?? "servant";

  const { data: rows } = await admin
    .from("profile_permissions")
    .select("permission, granted")
    .eq("profile_id", profileId);

  const list = rows ?? [];
  const custom = list.some((r) => r.permission === CUSTOM_FLAG);

  if (custom) {
    return {
      ok: true as const,
      custom: true,
      permissions: list
        .filter((r) => r.permission !== CUSTOM_FLAG && r.granted)
        .map((r) => r.permission),
      role,
    };
  }

  const { data: rolePerms } = await admin
    .from("role_permissions")
    .select("permission")
    .eq("role", role);

  return {
    ok: true as const,
    custom: false,
    permissions: (rolePerms ?? []).map((r) => r.permission),
    role,
  };
}

export async function saveProfileCustomPermissions(
  profileId: string,
  custom: boolean,
  permissions: string[]
) {
  const auth = await requirePermission("manage_permissions");
  if (!auth.ok) {
    const fallback = await requirePermission("manage_servants");
    if (!fallback.ok) return { ok: false as const, error: fallback.error };
  }

  const admin = createAdminClient();
  const { error: clearError } = await admin
    .from("profile_permissions")
    .delete()
    .eq("profile_id", profileId);
  if (clearError) return { ok: false as const, error: clearError.message };

  if (!custom) {
    revalidatePath("/admin/servants");
    revalidatePath("/admin/permissions");
    return { ok: true as const };
  }

  const allowed = new Set(PERMISSION_KEYS);
  let next = Array.from(
    new Set(permissions.filter((p) => allowed.has(p as (typeof PERMISSION_KEYS)[number])))
  );
  if (
    next.some((p) => p !== "book" && p !== "view_own_bookings") &&
    !next.includes("access_admin")
  ) {
    next.push("access_admin");
  }

  const rows = [
    { profile_id: profileId, permission: CUSTOM_FLAG, granted: true },
    ...PERMISSION_KEYS.map((permission) => ({
      profile_id: profileId,
      permission,
      granted: next.includes(permission),
    })),
  ];

  const { error } = await admin.from("profile_permissions").insert(rows);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/servants");
  revalidatePath("/admin/permissions");
  return { ok: true as const };
}
