import { notifyAdminNewBookingEmail } from "./email";
import { notifyAdminNewBookingTelegram } from "./telegram";
import {
  buildNewBookingWhatsAppText,
  notifyAdminNewBookingWhatsApp,
  notifyRequesterWhatsApp,
} from "./whatsapp";

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
  const adminUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/admin`
    : undefined;

  await Promise.allSettled([
    notifyAdminNewBookingTelegram(payload),
    notifyAdminNewBookingEmail({ ...payload, admin_url: adminUrl }),
    notifyAdminNewBookingWhatsApp(buildNewBookingWhatsAppText(payload)),
  ]);
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
  const statusAr = payload.status === "approved" ? "تمت الموافقة ✅" : "تم الرفض ❌";
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

  await notifyRequesterWhatsApp(payload.requester_phone, text);
}
