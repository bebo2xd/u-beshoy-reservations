const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = () => process.env.TELEGRAM_ADMIN_CHAT_ID;

export async function sendTelegramMessage(
  text: string,
  replyMarkup?: object
): Promise<boolean> {
  const token = TOKEN();
  const chatId = CHAT_ID();
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Telegram send failed", e);
    return false;
  }
}

export async function notifyAdminNewBookingTelegram(payload: {
  id: string;
  tracking_code: string;
  service_name: string;
  requester_name: string;
  requester_phone: string;
  room_name: string;
  date_label: string;
  time_label: string;
  notes?: string | null;
}): Promise<boolean> {
  const text = [
    "<b>طلب حجز جديد</b>",
    "",
    `🏛 المكان: ${payload.room_name}`,
    `📅 التاريخ: ${payload.date_label}`,
    `🕐 الوقت: ${payload.time_label}`,
    `✝️ الخدمة: ${payload.service_name}`,
    `👤 الاسم: ${payload.requester_name}`,
    `📱 التليفون: ${payload.requester_phone}`,
    payload.notes ? `📝 ملاحظات: ${payload.notes}` : null,
    `🔖 كود: <code>${payload.tracking_code}</code>`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(text, {
    inline_keyboard: [
      [
        { text: "✅ موافقة", callback_data: `approve:${payload.id}` },
        { text: "❌ رفض", callback_data: `reject:${payload.id}` },
      ],
    ],
  });
}

export async function answerTelegramCallback(callbackQueryId: string, text: string) {
  const token = TOKEN();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: true }),
  });
}

export async function editTelegramMessage(
  chatId: number | string,
  messageId: number,
  text: string
) {
  const token = TOKEN();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    }),
  });
}
