import { formatPhone } from "@/lib/utils";

const URL = () => process.env.EVOLUTION_URL;
const KEY = () => process.env.EVOLUTION_API_KEY;
const INSTANCE = () => process.env.EVOLUTION_INSTANCE;
const ADMIN_WA = () => process.env.ADMIN_WHATSAPP;

async function sendWhatsApp(number: string, text: string): Promise<boolean> {
  const base = URL();
  const key = KEY();
  const instance = INSTANCE();
  if (!base || !key || !instance || !number) return false;

  const phone = formatPhone(number);
  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/message/sendText/${instance}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
        },
        body: JSON.stringify({
          number: phone,
          text,
        }),
      }
    );
    return res.ok;
  } catch (e) {
    console.error("WhatsApp send failed", e);
    return false;
  }
}

export async function notifyAdminNewBookingWhatsApp(text: string): Promise<boolean> {
  const admin = ADMIN_WA();
  if (!admin) return false;
  return sendWhatsApp(admin, text);
}

export async function notifyRequesterWhatsApp(
  phone: string,
  text: string
): Promise<boolean> {
  return sendWhatsApp(phone, text);
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
