import { formatPhone } from "@/lib/utils";
import {
  evolutionSendText,
  getEvolutionConfig,
} from "@/lib/evolution/client";

export async function notifyAdminNewBookingWhatsApp(
  text: string
): Promise<boolean> {
  const config = await getEvolutionConfig();
  if (!config?.adminWhatsapp) return false;
  const res = await evolutionSendText(config.adminWhatsapp, text);
  return res.ok;
}

export async function notifyRequesterWhatsApp(
  phone: string,
  text: string
): Promise<boolean> {
  if (!phone) return false;
  const res = await evolutionSendText(formatPhone(phone), text);
  return res.ok;
}

export function buildNewBookingWhatsAppText(payload: {
  room_name: string;
  date_label: string;
  time_label: string;
  service_name: string;
  requester_name: string;
  requester_phone: string;
  tracking_code: string;
}): string {
  return [
    "*طلب حجز جديد*",
    `المكان: ${payload.room_name}`,
    `التاريخ: ${payload.date_label}`,
    `الوقت: ${payload.time_label}`,
    `الخدمة: ${payload.service_name}`,
    `الاسم: ${payload.requester_name}`,
    `التليفون: ${payload.requester_phone}`,
    `الكود: ${payload.tracking_code}`,
  ].join("\n");
}

export {
  buildDecisionWhatsAppText,
  buildWhatsAppClickToChatUrl,
} from "@/lib/whatsapp-link";

