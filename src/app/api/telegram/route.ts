import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  answerTelegramCallback,
  editTelegramMessage,
} from "@/lib/notify/telegram";
import { notifyBookingDecision } from "@/lib/notify";
import { formatDateAr } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cb = body?.callback_query;
    if (!cb?.data) {
      return NextResponse.json({ ok: true });
    }

    const [action, bookingId] = String(cb.data).split(":");
    if (!bookingId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ ok: true });
    }

    const status = action === "approve" ? "approved" : "rejected";
    const admin = createAdminClient();

    const { data: booking } = await admin
      .from("bookings")
      .select("*, rooms(name)")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      await answerTelegramCallback(cb.id, "الطلب غير موجود");
      return NextResponse.json({ ok: true });
    }

    if (booking.status !== "pending") {
      await answerTelegramCallback(cb.id, "تم البت في الطلب مسبقاً");
      return NextResponse.json({ ok: true });
    }

    const { error } = await admin
      .from("bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (error) {
      await answerTelegramCallback(cb.id, "فشل التحديث — ربما يوجد تعارض");
      return NextResponse.json({ ok: true });
    }

    const roomName = (booking.rooms as { name?: string } | null)?.name ?? "مكان";
    await notifyBookingDecision({
      requester_phone: booking.requester_phone,
      service_name: booking.service_name,
      room_name: roomName,
      date_label: formatDateAr(booking.booking_date),
      time_label: rangeLabel(booking.start_hour, booking.end_hour),
      status,
      tracking_code: booking.tracking_code,
    });

    const statusAr = status === "approved" ? "تمت الموافقة ✅" : "تم الرفض ❌";
    await answerTelegramCallback(cb.id, statusAr);
    if (cb.message) {
      await editTelegramMessage(
        cb.message.chat.id,
        cb.message.message_id,
        `${cb.message.text || ""}\n\n<b>${statusAr}</b>`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
