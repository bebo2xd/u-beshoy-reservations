"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, requireAdmin, requireAuth, requirePermission } from "@/lib/auth/session";
import { notifyBookingDecision, notifyNewBooking } from "@/lib/notify";
import { formatDateAr } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";
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

  after(async () => {
    try {
      await notifyBookingDecision({
        id: booking.id,
        created_by: booking.created_by,
        requester_phone: booking.requester_phone,
        service_name: booking.service_name,
        room_name: roomName,
        date_label: formatDateAr(booking.booking_date),
        time_label: rangeLabel(booking.start_hour, booking.end_hour),
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
