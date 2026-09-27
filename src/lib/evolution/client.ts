import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationPrefs } from "@/lib/notify/prefs";
import { mergeNotificationPrefs } from "@/lib/notify/prefs";

export type EvolutionConfig = {
  url: string;
  apiKey: string;
  instance: string;
  adminWhatsapp: string;
};

export type FullSettingsRow = {
  id: number;
  open_hour: number;
  close_hour: number;
  week_start_day: number;
  max_weeks_ahead: number;
  important_notes: string;
  site_title: string;
  notification_prefs: NotificationPrefs;
  evolution_url: string | null;
  evolution_api_key: string | null;
  evolution_instance: string | null;
  admin_whatsapp: string | null;
};

/** Resolve Evolution config: DB overrides env */
export async function getEvolutionConfig(): Promise<EvolutionConfig | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("settings")
      .select(
        "evolution_url, evolution_api_key, evolution_instance, admin_whatsapp"
      )
      .eq("id", 1)
      .maybeSingle();

    const url =
      data?.evolution_url?.trim() || process.env.EVOLUTION_URL?.trim() || "";
    const apiKey =
      data?.evolution_api_key?.trim() ||
      process.env.EVOLUTION_API_KEY?.trim() ||
      "";
    const instance =
      data?.evolution_instance?.trim() ||
      process.env.EVOLUTION_INSTANCE?.trim() ||
      "";
    const adminWhatsapp =
      data?.admin_whatsapp?.trim() ||
      process.env.ADMIN_WHATSAPP?.trim() ||
      "";

    if (!url || !apiKey || !instance) return null;
    return { url: url.replace(/\/$/, ""), apiKey, instance, adminWhatsapp };
  } catch {
    const url = process.env.EVOLUTION_URL?.trim();
    const apiKey = process.env.EVOLUTION_API_KEY?.trim();
    const instance = process.env.EVOLUTION_INSTANCE?.trim();
    if (!url || !apiKey || !instance) return null;
    return {
      url: url.replace(/\/$/, ""),
      apiKey,
      instance,
      adminWhatsapp: process.env.ADMIN_WHATSAPP?.trim() || "",
    };
  }
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("settings")
      .select("notification_prefs")
      .eq("id", 1)
      .maybeSingle();
    return mergeNotificationPrefs(
      data?.notification_prefs as Partial<NotificationPrefs> | null
    );
  } catch {
    return mergeNotificationPrefs(null);
  }
}

async function evolutionFetch(
  config: EvolutionConfig,
  path: string,
  init?: RequestInit
) {
  const res = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function extractQrBase64(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const candidates = [
    obj.base64,
    obj.qrcode,
    (obj.qrcode as Record<string, unknown> | undefined)?.base64,
    (obj.instance as Record<string, unknown> | undefined)?.qrcode,
    obj.qr,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 20) {
      return c.startsWith("data:") ? c : `data:image/png;base64,${c}`;
    }
  }
  return null;
}

function extractState(json: unknown): string {
  if (!json || typeof json !== "object") return "unknown";
  const obj = json as Record<string, unknown>;
  const state =
    obj.state ??
    obj.status ??
    (obj.instance as Record<string, unknown> | undefined)?.state ??
    (obj.instance as Record<string, unknown> | undefined)?.status;
  return typeof state === "string" ? state : "unknown";
}

export async function evolutionConnectionState() {
  const config = await getEvolutionConfig();
  if (!config) {
    return {
      ok: false as const,
      error: "بيانات Evolution غير مكتملة",
      state: "unconfigured",
      configured: false,
    };
  }
  const { ok, status, json } = await evolutionFetch(
    config,
    `/instance/connectionState/${encodeURIComponent(config.instance)}`
  );
  if (!ok) {
    return {
      ok: false as const,
      error: `فشل الاتصال (${status})`,
      state: extractState(json),
      configured: true,
      instance: config.instance,
      raw: json,
    };
  }
  return {
    ok: true as const,
    state: extractState(json),
    configured: true,
    instance: config.instance,
    raw: json,
  };
}

export async function evolutionFetchQr() {
  const config = await getEvolutionConfig();
  if (!config) {
    return { ok: false as const, error: "بيانات Evolution غير مكتملة" };
  }

  // Try connect endpoint first (generates/returns QR)
  let result = await evolutionFetch(
    config,
    `/instance/connect/${encodeURIComponent(config.instance)}`
  );
  let qr = extractQrBase64(result.json);

  if (!qr) {
    result = await evolutionFetch(
      config,
      `/instance/qrcode/${encodeURIComponent(config.instance)}`
    );
    qr = extractQrBase64(result.json);
  }

  if (!qr) {
    return {
      ok: false as const,
      error:
        "لم يُرجع السيرفر صورة QR. تأكد من اسم الـ Instance وأن الواتساب مش متصل بالفعل.",
      raw: result.json,
      state: extractState(result.json),
    };
  }

  return {
    ok: true as const,
    qr,
    state: extractState(result.json),
  };
}

export async function evolutionLogoutInstance() {
  const config = await getEvolutionConfig();
  if (!config) {
    return { ok: false as const, error: "بيانات Evolution غير مكتملة" };
  }
  const { ok, status, json } = await evolutionFetch(
    config,
    `/instance/logout/${encodeURIComponent(config.instance)}`,
    { method: "DELETE" }
  );
  if (!ok) {
    return {
      ok: false as const,
      error: `فشل تسجيل الخروج من الواتساب (${status})`,
      raw: json,
    };
  }
  return { ok: true as const };
}

export async function evolutionSendText(number: string, text: string) {
  const config = await getEvolutionConfig();
  if (!config) return { ok: false as const, error: "بيانات Evolution غير مكتملة" };
  if (!number) return { ok: false as const, error: "رقم غير موجود" };

  const { formatPhone } = await import("@/lib/utils");
  const phone = formatPhone(number);

  const { ok, status, json } = await evolutionFetch(
    config,
    `/message/sendText/${encodeURIComponent(config.instance)}`,
    {
      method: "POST",
      body: JSON.stringify({ number: phone, text }),
    }
  );

  if (!ok) {
    return {
      ok: false as const,
      error: `فشل الإرسال (${status})`,
      raw: json,
    };
  }
  return { ok: true as const, raw: json };
}

export async function evolutionCreateInstance(instanceName: string) {
  const config = await getEvolutionConfig();
  // Need at least url + apiKey; instance name from form
  const url =
    config?.url || process.env.EVOLUTION_URL?.replace(/\/$/, "") || "";
  const apiKey = config?.apiKey || process.env.EVOLUTION_API_KEY || "";
  if (!url || !apiKey) {
    return { ok: false as const, error: "احفظ رابط Evolution و API Key أولاً" };
  }

  const cfg: EvolutionConfig = {
    url,
    apiKey,
    instance: instanceName,
    adminWhatsapp: config?.adminWhatsapp || "",
  };

  const { ok, status, json } = await evolutionFetch(cfg, `/instance/create`, {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });

  if (!ok && status !== 403) {
    // 403 sometimes means already exists
    const msg =
      typeof json === "object" && json && "message" in json
        ? String((json as { message: unknown }).message)
        : `فشل إنشاء الـ Instance (${status})`;
    // If already exists, treat as ok
    if (!/exist|already/i.test(msg) && status !== 409) {
      return { ok: false as const, error: msg, raw: json };
    }
  }

  return {
    ok: true as const,
    qr: extractQrBase64(json),
    raw: json,
  };
}
