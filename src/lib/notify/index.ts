import { notifyAdminNewBookingEmail } from "./email";
import { notifyAdminNewBookingTelegram } from "./telegram";
import {
  buildNewBookingWhatsAppText,
  notifyAdminNewBookingWhatsApp,
  notifyRequesterWhatsApp,
} from "./whatsapp";
import { getNotificationPrefs } from "@/lib/evolution/client";

export async function notifyNewBooking(payload: {
  id: string;
  tracking_code: string;
  service_name: string;
  requester_name: string;
  requester_phone: string;
  room_name: string;
  date_label: string;
  time_label: string;
  notes?: string | null;
}) {
  const prefs = await getNotificationPrefs();
  const adminUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/admin`
    : undefined;

  const tasks: Promise<unknown>[] = [];

  if (prefs.new_booking_telegram) {
    tasks.push(notifyAdminNewBookingTelegram(payload));
  }
  if (prefs.new_booking_email) {
    tasks.push(
      notifyAdminNewBookingEmail({ ...payload, admin_url: adminUrl })
    );
  }
  if (prefs.new_booking_whatsapp_admin) {
    tasks.push(
      notifyAdminNewBookingWhatsApp(buildNewBookingWhatsAppText(payload))
    );
  }

  await Promise.allSettled(tasks);
}

export async function notifyBookingDecision(payload: {
  requester_phone: string;
  service_name: string;
  room_name: string;
  date_label: string;
  time_label: string;
  status: "approved" | "rejected";
  admin_note?: string | null;
  tracking_code: string;
}) {
  const prefs = await getNotificationPrefs();
  const statusAr =
    payload.status === "approved" ? "تمت الموافقة ✅" : "تم الرفض ❌";
  const text = [
    `*تحديث طلب الحجز*`,
    statusAr,
    `الخدمة: ${payload.service_name}`,
    `المكان: ${payload.room_name}`,
    `التاريخ: ${payload.date_label}`,
    `الوقت: ${payload.time_label}`,
    `الكود: ${payload.tracking_code}`,
    payload.admin_note ? `ملاحظة: ${payload.admin_note}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const tasks: Promise<unknown>[] = [];
  if (prefs.decision_whatsapp_requester) {
    tasks.push(notifyRequesterWhatsApp(payload.requester_phone, text));
  }
  if (prefs.decision_whatsapp_admin) {
    tasks.push(notifyAdminNewBookingWhatsApp(text));
  }
  await Promise.allSettled(tasks);
}

export async function notifyBookingCancelled(payload: {
  requester_phone: string;
  service_name: string;
  room_name: string;
  date_label: string;
  time_label: string;
  tracking_code: string;
}) {
  const prefs = await getNotificationPrefs();
  const text = [
    "*تم إلغاء طلب حجز*",
    `الخدمة: ${payload.service_name}`,
    `المكان: ${payload.room_name}`,
    `التاريخ: ${payload.date_label}`,
    `الوقت: ${payload.time_label}`,
    `الكود: ${payload.tracking_code}`,
  ].join("\n");

  const tasks: Promise<unknown>[] = [];
  if (prefs.cancel_whatsapp_requester) {
    tasks.push(notifyRequesterWhatsApp(payload.requester_phone, text));
  }
  if (prefs.cancel_whatsapp_admin) {
    tasks.push(notifyAdminNewBookingWhatsApp(text));
  }
  await Promise.allSettled(tasks);
}
