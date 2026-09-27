"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  requesterName: string;
  requesterPhone: string;
  notes?: string;
  honeypot?: string;
}) {
  if (form.honeypot) {
    return { ok: false as const, error: "تم رفض الطلب" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking_request", {
    p_room_id: form.roomId,
    p_date: form.date,
    p_start_hour: form.startHour,
    p_end_hour: form.endHour,
    p_service_name: form.serviceName,
    p_requester_name: form.requesterName,
    p_requester_phone: form.requesterPhone,
    p_notes: form.notes ?? null,
  });

  if (error) {
    console.error(error);
    return { ok: false as const, error: "حدث خطأ أثناء إرسال الطلب" };
  }

  const result = data as { ok: boolean; error?: string; tracking_code?: string; id?: string };
  if (!result.ok) {
    return { ok: false as const, error: result.error ?? "تعذر إنشاء الطلب" };
  }

  // Fetch room name for notifications
  try {
    const { data: room } = await supabase
      .from("rooms")
      .select("name")
      .eq("id", form.roomId)
      .single();

    await notifyNewBooking({
      id: result.id!,
      tracking_code: result.tracking_code!,
      service_name: form.serviceName,
      requester_name: form.requesterName,
      requester_phone: form.requesterPhone,
      room_name: room?.name ?? "مكان",
      date_label: formatDateAr(form.date),
      time_label: rangeLabel(form.startHour, form.endHour),
      notes: form.notes,
    });
  } catch (e) {
    console.error("Notify failed", e);
  }

  revalidatePath("/book");
  revalidatePath("/admin");
  return { ok: true as const, tracking_code: result.tracking_code! };
}

export async function cancelBooking(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_booking_by_code", {
    p_code: code,
  });
  if (error) return { ok: false as const, error: "حدث خطأ" };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { ok: false as const, error: result.error ?? "تعذر الإلغاء" };
  revalidatePath("/admin");
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "غير مصرح" };

  // Prefer service role when available (bypasses RLS edge cases)
  let admin = supabase;
  try {
    admin = createAdminClient();
  } catch {
    admin = supabase;
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

  await notifyBookingDecision({
    requester_phone: booking.requester_phone,
    service_name: booking.service_name,
    room_name: roomName,
    date_label: formatDateAr(booking.booking_date),
    time_label: rangeLabel(booking.start_hour, booking.end_hour),
    status,
    admin_note: adminNote,
    tracking_code: booking.tracking_code,
  });

  revalidatePath("/admin");
  revalidatePath("/book");
  return { ok: true as const };
}
