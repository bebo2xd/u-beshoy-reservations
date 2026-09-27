const RESEND_KEY = () => process.env.RESEND_API_KEY;
const ADMIN_EMAIL = () => process.env.ADMIN_EMAIL;
const FROM_EMAIL = () => process.env.FROM_EMAIL ?? "onboarding@resend.dev";

export async function sendAdminEmail(subject: string, html: string): Promise<boolean> {
  const key = RESEND_KEY();
  const to = ADMIN_EMAIL();
  if (!key || !to) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL(),
        to: [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Email send failed", e);
    return false;
  }
}

export async function notifyAdminNewBookingEmail(payload: {
  service_name: string;
  requester_name: string;
  requester_phone: string;
  room_name: string;
  date_label: string;
  time_label: string;
  tracking_code: string;
  admin_url?: string;
}): Promise<boolean> {
  const html = `
    <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;color:#21201c">
      <h2 style="color:#12A594">طلب حجز جديد</h2>
      <p><b>المكان:</b> ${payload.room_name}</p>
      <p><b>التاريخ:</b> ${payload.date_label}</p>
      <p><b>الوقت:</b> ${payload.time_label}</p>
      <p><b>الخدمة:</b> ${payload.service_name}</p>
      <p><b>مقدم الطلب:</b> ${payload.requester_name}</p>
      <p><b>التليفون:</b> ${payload.requester_phone}</p>
      <p><b>كود المتابعة:</b> ${payload.tracking_code}</p>
      ${
        payload.admin_url
          ? `<p><a href="${payload.admin_url}" style="background:#12A594;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">فتح لوحة التحكم</a></p>`
          : ""
      }
    </div>
  `;
  return sendAdminEmail(`طلب حجز جديد — ${payload.service_name}`, html);
}
