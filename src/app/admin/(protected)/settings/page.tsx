import { getSettings } from "@/lib/data";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { mergeNotificationPrefs } from "@/lib/notify/prefs";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  let evolution_url = settings.evolution_url ?? null;
  let evolution_instance = settings.evolution_instance ?? null;
  let admin_whatsapp = settings.admin_whatsapp ?? null;
  let has_evolution_api_key = Boolean(settings.evolution_api_key);
  let notification_prefs = mergeNotificationPrefs(settings.notification_prefs);
  let smtp_host = settings.smtp_host ?? null;
  let smtp_port = settings.smtp_port ?? 587;
  let smtp_secure = Boolean(settings.smtp_secure);
  let smtp_user = settings.smtp_user ?? null;
  let smtp_from = settings.smtp_from ?? null;
  let admin_email = settings.admin_email ?? null;
  let has_smtp_password = Boolean(settings.smtp_password);

  try {
    const admin = createAdminClient();
    const { data } = await admin.from("settings").select("*").eq("id", 1).single();
    if (data) {
      evolution_url = data.evolution_url;
      evolution_instance = data.evolution_instance;
      admin_whatsapp = data.admin_whatsapp;
      has_evolution_api_key = Boolean(data.evolution_api_key);
      notification_prefs = mergeNotificationPrefs(data.notification_prefs);
      smtp_host = data.smtp_host;
      smtp_port = data.smtp_port ?? 587;
      smtp_secure = Boolean(data.smtp_secure);
      smtp_user = data.smtp_user;
      smtp_from = data.smtp_from;
      admin_email = data.admin_email;
      has_smtp_password = Boolean(data.smtp_password);
    }
  } catch {
    /* fallback to getSettings */
  }

  const smtpConfigured = Boolean(
    (smtp_host && smtp_user && has_smtp_password && admin_email) ||
      (process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASSWORD &&
        process.env.ADMIN_EMAIL)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">
          عام · تنبيهات · واتساب · إيميل SMTP · قنوات أخرى
        </p>
      </div>
      <SettingsForm
        settings={{
          ...settings,
          evolution_url,
          evolution_instance,
          admin_whatsapp,
          evolution_api_key: null,
          has_evolution_api_key,
          notification_prefs,
          smtp_host,
          smtp_port,
          smtp_secure,
          smtp_user,
          smtp_password: null,
          smtp_from,
          admin_email,
          has_smtp_password,
          channel_status: {
            telegram: Boolean(
              process.env.TELEGRAM_BOT_TOKEN &&
                process.env.TELEGRAM_ADMIN_CHAT_ID
            ),
            email: smtpConfigured,
            evolution_env_fallback: Boolean(
              process.env.EVOLUTION_URL &&
                process.env.EVOLUTION_API_KEY &&
                process.env.EVOLUTION_INSTANCE
            ),
          },
        }}
      />
    </div>
  );
}
