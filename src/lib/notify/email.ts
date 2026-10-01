import nodemailer from "nodemailer";
import { getSmtpConfig, type SmtpConfig } from "./smtp";
import { getNotifyAdminRecipients } from "./recipients";

export async function sendAdminEmail(
  subject: string,
  html: string
): Promise<boolean> {
  const cfg = await getSmtpConfig();
  if (!cfg) return false;

  const recipients = await getNotifyAdminRecipients();
  const emails = [
    ...new Set(
      recipients.recipients
        .map((r) => r.email?.trim().toLowerCase() || "")
        .filter(Boolean)
    ),
  ];

  if (emails.length === 0 && cfg.adminEmail) {
    emails.push(cfg.adminEmail);
  }
  if (emails.length === 0) return false;

  const results = await Promise.all(
    emails.map((to) => sendMail(cfg, to, subject, html))
  );
  return results.some(Boolean);
}

async function sendMail(
  cfg: SmtpConfig,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.password,
      },
    });

    await transporter.sendMail({
      from: cfg.from,
      to,
      subject,
      html,
    });
    return true;
  } catch (e) {
    console.error("SMTP send failed", e);
    return false;
  }
}

export async function sendTestSmtpEmail(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const cfg = await getSmtpConfig();
  if (!cfg) {
    return {
      ok: false,
      error: "إعدادات SMTP غير مكتملة (المضيف / المستخدم / كلمة المرور / إيميل الأدمن)",
    };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.password,
      },
    });
    await transporter.verify();
    await transporter.sendMail({
      from: cfg.from,
      to: cfg.adminEmail,
      subject: "اختبار SMTP — حجز الغرف",
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif">
        <p>لو وصلت الرسالة دي، إعدادات SMTP شغّالة ✓</p>
      </div>`,
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل إرسال الاختبار";
    console.error("SMTP test failed", e);
    return { ok: false, error: message };
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
