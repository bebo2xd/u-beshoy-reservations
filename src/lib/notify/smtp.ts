import { createAdminClient } from "@/lib/supabase/admin";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  /** Full From header: "Platform Name" <email@domain.com> */
  from: string;
  adminEmail: string;
  siteTitle: string;
};

const DEFAULT_SITE_TITLE = "حجز غرف مبنى الخدمات";

function resolveSecure(
  dbSecure: boolean | null | undefined,
  port: number
): boolean {
  if (dbSecure != null) return Boolean(dbSecure);
  if (process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1") {
    return true;
  }
  if (process.env.SMTP_SECURE === "false" || process.env.SMTP_SECURE === "0") {
    return false;
  }
  return port === 465;
}

/** Extract bare email if value already includes a display name */
function bareEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return value.trim();
}

/** Build RFC From with platform display name */
export function formatSmtpFrom(siteTitle: string, emailOrFrom: string): string {
  const email = bareEmail(emailOrFrom);
  const name = siteTitle.trim() || DEFAULT_SITE_TITLE;
  // Escape quotes in display name
  const safeName = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${safeName}" <${email}>`;
}

/** Resolve SMTP: DB overrides env */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("settings")
      .select(
        "site_title, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_password, smtp_from, admin_email"
      )
      .eq("id", 1)
      .maybeSingle();

    const siteTitle =
      data?.site_title?.trim() ||
      process.env.SITE_TITLE?.trim() ||
      DEFAULT_SITE_TITLE;
    const host =
      data?.smtp_host?.trim() || process.env.SMTP_HOST?.trim() || "";
    const port = Number(data?.smtp_port ?? process.env.SMTP_PORT ?? 587);
    const user =
      data?.smtp_user?.trim() || process.env.SMTP_USER?.trim() || "";
    const password =
      data?.smtp_password?.trim() || process.env.SMTP_PASSWORD?.trim() || "";
    const fromEmail =
      data?.smtp_from?.trim() ||
      process.env.SMTP_FROM?.trim() ||
      process.env.FROM_EMAIL?.trim() ||
      user;
    const adminEmail =
      data?.admin_email?.trim() || process.env.ADMIN_EMAIL?.trim() || "";
    const safePort = Number.isFinite(port) && port > 0 ? port : 587;
    const secure = resolveSecure(data?.smtp_secure, safePort);

    if (!host || !user || !password || !adminEmail || !fromEmail) return null;
    return {
      host,
      port: safePort,
      secure,
      user,
      password,
      from: formatSmtpFrom(siteTitle, fromEmail),
      adminEmail,
      siteTitle,
    };
  } catch {
    return smtpFromEnv();
  }
}

function smtpFromEnv(): SmtpConfig | null {
  const siteTitle = process.env.SITE_TITLE?.trim() || DEFAULT_SITE_TITLE;
  const host = process.env.SMTP_HOST?.trim() || "";
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim() || "";
  const password = process.env.SMTP_PASSWORD?.trim() || "";
  const fromEmail =
    process.env.SMTP_FROM?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    user;
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || "";
  const safePort = Number.isFinite(port) && port > 0 ? port : 587;

  if (!host || !user || !password || !adminEmail || !fromEmail) return null;
  return {
    host,
    port: safePort,
    secure: resolveSecure(undefined, safePort),
    user,
    password,
    from: formatSmtpFrom(siteTitle, fromEmail),
    adminEmail,
    siteTitle,
  };
}
