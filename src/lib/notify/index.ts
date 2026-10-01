import { notifyAdminNewBookingEmail } from "./email";
import { notifyAdminNewBookingTelegram } from "./telegram";
import {
  buildNewBookingWhatsAppText,
  notifyAdminNewBookingWhatsApp,
  notifyRequesterWhatsApp,
} from "./whatsapp";
import { buildDecisionWhatsAppText } from "@/lib/whatsapp-link";
import { getNotificationPrefs } from "@/lib/evolution/client";
import {
  getActiveAdminUserIds,
  sendOneSignalPush,
  sendOneSignalPushToRole,
} from "./onesignal";

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
  const deepLink = `/admin?booking=${payload.id}`;
  const pushContent = {
    heading: "طلب حجز جديد",
    body: [
      payload.service_name,
      payload.room_name,
      payload.date_label,
      payload.time_label,
      payload.requester_name,
      payload.tracking_code,
    ].join(" · "),
    url: deepLink,
    data: { bookingId: payload.id },
  };

  // Push first — don't let email/telegram/whatsapp delays block it.
  if (prefs.new_booking_push_admin !== false) {
    try {
      const adminIds = await getActiveAdminUserIds();
      console.info("Push new booking to admins", {
        bookingId: payload.id,
        adminIds,
      });

      let result: { ok: boolean; error?: string; id?: string };
      if (adminIds.length > 0) {
        result = await sendOneSignalPush({
          ...pushContent,
          externalIds: adminIds,
        });
        // Only fall back to role tag if alias targeting failed.
        if (!result.ok) {
          console.warn("Alias push failed, falling back to role tag", result);
          result = await sendOneSignalPushToRole("admin", pushContent);
        }
      } else {
        result = await sendOneSignalPushToRole("admin", pushContent);
      }
      console.info("Push new booking result", result);
    } catch (e) {
      console.error("Push new booking failed", e);
    }
  }

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
  id?: string;
  created_by?: string | null;
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
  const text = buildDecisionWhatsAppText(payload);
  const statusAr =
    payload.status === "approved" ? "تمت الموافقة ✅" : "تم الرفض ❌";

  const deepLink = payload.tracking_code
    ? `/r/${payload.tracking_code}`
    : "/my-bookings";

  const pushContent = {
    heading: statusAr.replace(/[✅❌]/g, "").trim(),
    body: [
      payload.service_name,
      payload.room_name,
      payload.date_label,
      payload.time_label,
    ].join(" · "),
    url: deepLink,
    data: {
      bookingId: payload.id ?? "",
      tracking_code: payload.tracking_code,
      status: payload.status,
    },
  };

  if (prefs.decision_push_requester !== false && payload.created_by) {
    try {
      const result = await sendOneSignalPush({
        ...pushContent,
        externalIds: [payload.created_by],
      });
      console.info("Push booking decision result", result);
    } catch (e) {
      console.error("Push booking decision failed", e);
    }
  }

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
