import { formatPhone } from "@/lib/utils";

export type DecisionMessagePayload = {
  status: "approved" | "rejected";
  service_name: string;
  room_name: string;
  date_label: string;
  time_label: string;
  tracking_code: string;
  admin_note?: string | null;
};

/** رسالة واتساب أنيقة للموافقة / الرفض */
export function buildDecisionWhatsAppText(payload: DecisionMessagePayload): string {
  const approved = payload.status === "approved";
  const headline = approved
    ? "✅ تمت الموافقة على طلب الحجز"
    : "❌ تم رفض طلب الحجز";

  const lines = [
    headline,
    "",
    `🏛 المكان: ${payload.room_name}`,
    `📅 التاريخ: ${payload.date_label}`,
    `🕐 الوقت: ${payload.time_label}`,
    `🙏 الخدمة: ${payload.service_name}`,
    `🔖 الكود: ${payload.tracking_code}`,
  ];

  if (payload.admin_note?.trim()) {
    lines.push("", `📝 ملاحظة: ${payload.admin_note.trim()}`);
  }

  return lines.join("\n");
}

/** رابط wa.me يفتح واتساب بالرسالة جاهزة */
export function buildWhatsAppClickToChatUrl(
  phone: string,
  text: string
): string | null {
  const formatted = formatPhone(phone);
  if (!formatted) return null;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`;
}
