"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, requireAdmin, requireAuth, requirePermission } from "@/lib/auth/session";
import { notifyBookingDecision, notifyNewBooking } from "@/lib/notify";
import { formatDateAr, isSlotPast } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";
import {
  listBookingIds,
  listBookingsPage,
  type BookingListFilters,
} from "@/lib/data";
import type { BookingListStatus, BookingStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function submitBookingRequest(form: {
  roomId: string;
  date: string;
  startHour: number;
  endHour: number;
  serviceName: string;
  notes?: string;
  honeypot?: string;
}) {
  if (form.honeypot) {
    return { ok: false as const, error: "تم رفض الطلب" };
  }

  if (isSlotPast(form.date, form.startHour)) {
    return {
      ok: false as const,
      error: "مش هتقدر تحجز في وقت فات — اختَر ساعة لسه جاية",
    };
  }

  const auth = await requireAuth();
  if (!auth.ok || !auth.supabase || !auth.profile) {
    return { ok: false as const, error: auth.error ?? "يجب تسجيل الدخول" };
  }

  const { data, error } = await auth.supabase.rpc("create_booking_request", {
    p_room_id: form.roomId,
    p_date: form.date,
    p_start_hour: form.startHour,
    p_end_hour: form.endHour,
    p_service_name: form.serviceName,
    p_requester_name: auth.profile.full_name,
    p_requester_phone: auth.profile.phone,
    p_notes: form.notes ?? null,
  });

  if (error) {
    console.error(error);
    if (/smallint|numeric|22P02/i.test(error.message)) {
      return {
        ok: false as const,
        error:
          "إعدادات نصف الساعة غير مكتملة في قاعدة البيانات. تواصل مع الإدارة",
      };
    }
    return { ok: false as const, error: "حدث خطأ أثناء إرسال الطلب" };
  }

  const result = data as {
    ok: boolean;
    error?: string;
    tracking_code?: string;
    id?: string;
  };
  if (!result.ok) {
    return { ok: false as const, error: result.error ?? "تعذر إنشاء الطلب" };
  }

  const notifyPayload = {
    id: result.id!,
    tracking_code: result.tracking_code!,
    service_name: form.serviceName,
    requester_name: auth.profile.full_name,
    requester_phone: auth.profile.phone,
    room_name: "" as string,
    date_label: formatDateAr(form.date),
    time_label: rangeLabel(form.startHour, form.endHour),
    notes: form.notes,
  };

  try {
    const { data: room } = await auth.supabase
      .from("rooms")
      .select("name")
      .eq("id", form.roomId)
      .single();
    notifyPayload.room_name = room?.name ?? "مكان";
  } catch {
    notifyPayload.room_name = "مكان";
  }

  // Run notifications after the response so Vercel keeps the function alive via waitUntil.
  after(async () => {
    try {
      await notifyNewBooking(notifyPayload);
    } catch (e) {
      console.error("Notify failed", e);
    }
  });

  revalidatePath("/book");
  revalidatePath("/my-bookings");
  revalidatePath("/admin");
  return { ok: true as const, tracking_code: result.tracking_code! };
}

export async function cancelBooking(code: string) {
  const auth = await requireAuth();
  if (!auth.ok || !auth.supabase) {
    return { ok: false as const, error: auth.error ?? "يجب تسجيل الدخول" };
  }

  const tracking = code.trim().toUpperCase();
  const { data: booking } = await auth.supabase
    .from("bookings")
    .select("requester_phone, service_name, booking_date, start_hour, end_hour, tracking_code, rooms(name)")
    .eq("tracking_code", tracking)
    .maybeSingle();

  const { data, error } = await auth.supabase.rpc("cancel_booking_by_code", {
    p_code: tracking,
  });
  if (error) return { ok: false as const, error: "حدث خطأ" };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? "تعذر الإلغاء" };

  if (booking) {
    try {
      const { notifyBookingCancelled } = await import("@/lib/notify");
      const { formatDateAr } = await import("@/lib/dates");
      const { rangeLabel } = await import("@/lib/constants");
      const room = booking.rooms as { name?: string } | null;
      await notifyBookingCancelled({
        requester_phone: booking.requester_phone,
        service_name: booking.service_name,
        room_name: room?.name ?? "مكان",
        date_label: formatDateAr(booking.booking_date),
        time_label: rangeLabel(booking.start_hour, booking.end_hour),
        tracking_code: booking.tracking_code,
      });
    } catch (e) {
      console.error("Cancel notify failed", e);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/my-bookings");
  revalidatePath("/book");
  return { ok: true as const };
}

export async function getBookingTracking(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_booking_by_code", {
    p_code: code,
  });
  if (error) return { ok: false as const, error: "حدث خطأ" };
  return data as {
    ok: boolean;
    error?: string;
    booking?: Record<string, unknown>;
  };
}

export async function decideBooking(
  bookingId: string,
  status: "approved" | "rejected",
  adminNote?: string
) {
  const auth = await requirePermission("decide_bookings");
  if (!auth.ok) {
    return { ok: false as const, error: auth.error ?? "غير مصرح" };
  }

  let admin = auth.supabase!;
  try {
    admin = createAdminClient();
  } catch {
    /* use session client */
  }

  const { data: booking, error } = await admin
    .from("bookings")
    .select("*, rooms(name)")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return { ok: false as const, error: "الطلب غير موجود" };
  }

  if (booking.status !== "pending") {
    return { ok: false as const, error: "الطلب تم البت فيه مسبقاً" };
  }

  const { error: updateError } = await admin
    .from("bookings")
    .update({
      status,
      admin_note: adminNote ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    if (updateError.code === "23P01") {
      return { ok: false as const, error: "يوجد تعارض مع حجز آخر" };
    }
    return { ok: false as const, error: "تعذر تحديث الطلب" };
  }

  const roomName =
    (booking.rooms as { name?: string } | null)?.name ?? "مكان";

  const dateLabel = formatDateAr(booking.booking_date);
  const timeLabel = rangeLabel(booking.start_hour, booking.end_hour);

  after(async () => {
    try {
      await notifyBookingDecision({
        id: booking.id,
        created_by: booking.created_by,
        requester_phone: booking.requester_phone,
        service_name: booking.service_name,
        room_name: roomName,
        date_label: dateLabel,
        time_label: timeLabel,
        status,
        admin_note: adminNote,
        tracking_code: booking.tracking_code,
      });
    } catch (e) {
      console.error("Decision notify failed", e);
    }
  });

  revalidatePath("/admin");
  revalidatePath("/book");
  revalidatePath("/my-bookings");
  return { ok: true as const };
}

export async function getMyBookingsAction() {
  const profile = await getProfile();
  if (!profile) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("*, rooms(name, color)")
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Soft client refresh for admin recent-bookings panel (no full RSC remount). */
export async function fetchBookingsPageAction(opts: {
  q?: string;
  status?: BookingListStatus;
  roomId?: string;
  page?: number;
  pageSize?: number;
}) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return { ok: false as const, error: auth.error ?? "غير مصرح", items: [], total: 0, page: 1, pageSize: 20 };
  }
  const result = await listBookingsPage(opts);
  return { ok: true as const, ...result };
}

/** All IDs matching current filters — for “select all results”. */
export async function fetchBookingIdsAction(opts: BookingListFilters) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return {
      ok: false as const,
      error: auth.error ?? "غير مصرح",
      ids: [] as string[],
      statuses: {} as Record<string, BookingStatus>,
      total: 0,
      capped: false,
    };
  }
  const result = await listBookingIds(opts);
  return { ok: true as const, ...result };
}

/**
 * Bulk approve/reject — only pending rows among the selection are updated.
 * Already-decided bookings are skipped; overlap conflicts are counted separately.
 */
export async function decideBookingsAction(
  ids: string[],
  status: "approved" | "rejected"
) {
  const auth = await requirePermission("decide_bookings");
  if (!auth.ok) {
    return {
      ok: false as const,
      error: auth.error ?? "غير مصرح",
      decided: 0,
      skipped: 0,
      conflicts: 0,
    };
  }

  const unique = Array.from(
    new Set(ids.map((id) => id.trim()).filter(Boolean))
  ).slice(0, 5000);

  if (unique.length === 0) {
    return {
      ok: false as const,
      error: "لم يتم اختيار أي طلب",
      decided: 0,
      skipped: 0,
      conflicts: 0,
    };
  }

  let admin = auth.supabase!;
  try {
    admin = createAdminClient();
  } catch {
    /* use session client */
  }

  const candidates: Array<{
    id: string;
    created_by: string | null;
    requester_phone: string;
    service_name: string;
    booking_date: string;
    start_hour: number;
    end_hour: number;
    tracking_code: string;
    rooms: { name?: string } | null;
  }> = [];

  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await admin
      .from("bookings")
      .select("*, rooms(name)")
      .in("id", chunk)
      .eq("status", "pending");

    if (error) {
      console.error("decideBookingsAction fetch", error);
      return {
        ok: false as const,
        error: "تعذر قراءة الطلبات المحددة",
        decided: 0,
        skipped: 0,
        conflicts: 0,
      };
    }
    candidates.push(...((data as typeof candidates) ?? []));
  }

  const skipped = unique.length - candidates.length;
  let decided = 0;
  let conflicts = 0;
  const notified: typeof candidates = [];

  for (const booking of candidates) {
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .eq("status", "pending");

    if (updateError) {
      if (updateError.code === "23P01") {
        conflicts += 1;
        continue;
      }
      console.error("decideBookingsAction update", updateError);
      continue;
    }

    decided += 1;
    notified.push(booking);
  }

  after(async () => {
    for (const booking of notified) {
      try {
        await notifyBookingDecision({
          id: booking.id,
          created_by: booking.created_by,
          requester_phone: booking.requester_phone,
          service_name: booking.service_name,
          room_name: booking.rooms?.name ?? "مكان",
          date_label: formatDateAr(booking.booking_date),
          time_label: rangeLabel(booking.start_hour, booking.end_hour),
          status,
          tracking_code: booking.tracking_code,
        });
      } catch (e) {
        console.error("Bulk decision notify failed", e);
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath("/book");
  revalidatePath("/my-bookings");

  if (decided === 0 && conflicts === 0) {
    return {
      ok: false as const,
      error: "مفيش طلبات معلقة ضمن التحديد",
      decided: 0,
      skipped,
      conflicts: 0,
    };
  }

  return { ok: true as const, decided, skipped, conflicts };
}

/** Cancel pending or approved bookings so the room is free again. */
export async function cancelBookingsAction(ids: string[]) {
  const auth = await requirePermission("decide_bookings");
  if (!auth.ok) {
    return { ok: false as const, error: auth.error ?? "غير مصرح", cancelled: 0, skipped: 0 };
  }

  const unique = Array.from(
    new Set(ids.map((id) => id.trim()).filter(Boolean))
  ).slice(0, 5000);

  if (unique.length === 0) {
    return { ok: false as const, error: "لم يتم اختيار أي طلب", cancelled: 0, skipped: 0 };
  }

  let admin = auth.supabase!;
  try {
    admin = createAdminClient();
  } catch {
    /* use session client */
  }

  type Row = {
    id: string;
    status: string;
    requester_phone: string;
    service_name: string;
    booking_date: string;
    start_hour: number;
    end_hour: number;
    tracking_code: string;
    rooms: { name?: string } | null;
  };

  const rows: Row[] = [];
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await admin
      .from("bookings")
      .select("id, status, requester_phone, service_name, booking_date, start_hour, end_hour, tracking_code, rooms(name)")
      .in("id", chunk);
    if (error) {
      console.error("cancelBookingsAction fetch", error);
      return { ok: false as const, error: "تعذر قراءة الطلبات", cancelled: 0, skipped: 0 };
    }
    rows.push(...((data as Row[]) ?? []));
  }

  const cancellable = rows.filter(
    (row) => row.status === "pending" || row.status === "approved"
  );
  const skipped = unique.length - cancellable.length;
  if (cancellable.length === 0) {
    return {
      ok: false as const,
      error: "مفيش حجوزات قابلة للإلغاء ضمن التحديد",
      cancelled: 0,
      skipped,
    };
  }

  const idsToCancel = cancellable.map((row) => row.id);
  let cancelled = 0;
  for (let i = 0; i < idsToCancel.length; i += chunkSize) {
    const chunk = idsToCancel.slice(i, i + chunkSize);
    const { data, error } = await admin
      .from("bookings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .in("id", chunk)
      .in("status", ["pending", "approved"])
      .select("id");
    if (error) {
      console.error("cancelBookingsAction update", error);
      return {
        ok: false as const,
        error: cancelled > 0 ? `اتلغى ${cancelled} وبعدين حصل خطأ` : "تعذر إلغاء الحجوزات",
        cancelled,
        skipped,
      };
    }
    cancelled += data?.length ?? 0;
  }

  const { notifyBookingCancelled } = await import("@/lib/notify");
  after(async () => {
    for (const row of cancellable) {
      try {
        await notifyBookingCancelled({
          requester_phone: row.requester_phone,
          service_name: row.service_name,
          room_name: row.rooms?.name ?? "مكان",
          date_label: formatDateAr(row.booking_date),
          time_label: rangeLabel(row.start_hour, row.end_hour),
          tracking_code: row.tracking_code,
        });
      } catch (e) {
        console.error("Cancel notify failed", e);
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/calendar");
  revalidatePath("/book");
  revalidatePath("/my-bookings");
  return { ok: true as const, cancelled, skipped };
}

/** Hard-delete one or more bookings from the admin list. */
export async function deleteBookingsAction(ids: string[]) {
  const auth = await requirePermission("decide_bookings");
  if (!auth.ok) {
    return { ok: false as const, error: auth.error ?? "غير مصرح", deleted: 0 };
  }

  const unique = Array.from(
    new Set(ids.map((id) => id.trim()).filter(Boolean))
  ).slice(0, 5000);

  if (unique.length === 0) {
    return { ok: false as const, error: "لم يتم اختيار أي طلب", deleted: 0 };
  }

  let admin = auth.supabase!;
  try {
    admin = createAdminClient();
  } catch {
    /* use session client */
  }

  let deleted = 0;
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data, error } = await admin
      .from("bookings")
      .delete()
      .in("id", chunk)
      .select("id");

    if (error) {
      console.error("deleteBookingsAction", error);
      return {
        ok: false as const,
        error:
          deleted > 0
            ? `اتحذف ${deleted} طلب وبعدين حصل خطأ`
            : "تعذر حذف الطلبات",
        deleted,
      };
    }
    deleted += data?.length ?? 0;
  }

  revalidatePath("/admin");
  revalidatePath("/book");
  revalidatePath("/my-bookings");
  return { ok: true as const, deleted };
}
