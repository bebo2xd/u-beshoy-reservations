type PushContent = {
  heading: string;
  body: string;
  url: string;
  data?: Record<string, string>;
};

export const BOOKING_ANDROID_CHANNEL_ID = "booking_alerts";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://u-beshoy-reservations.vercel.app"
  );
}

function buildCommonFields(payload: PushContent) {
  const path = payload.url.startsWith("/")
    ? payload.url
    : `/${payload.url.replace(/^\//, "")}`;
  const absoluteUrl = payload.url.startsWith("http")
    ? payload.url
    : `${appBaseUrl()}${path}`;

  return {
    path,
    absoluteUrl,
    body: {
      app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
      name: payload.heading,
      target_channel: "push",
      headings: { en: payload.heading, ar: payload.heading },
      contents: { en: payload.body, ar: payload.body },
      // OneSignal rejects combining `url` with `app_url`/`web_url`.
      app_url: absoluteUrl,
      data: {
        url: path,
        ...(payload.data ?? {}),
      },
      small_icon: "ic_stat_onesignal_default",
      large_icon: "ic_onesignal_large_icon_default",
      android_accent_color: "FFB91C1C",
      android_visibility: 1,
      priority: 10,
      ios_sound: "default",
    },
  };
}

async function postOneSignal(body: Record<string, unknown>) {
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  if (!appId || !apiKey) {
    console.error("OneSignal not configured", {
      hasAppId: Boolean(appId),
      hasApiKey: Boolean(apiKey),
    });
    return { ok: false as const, error: "OneSignal not configured" };
  }

  // Strip undefined / empty optional Android fields that can 400 on some accounts.
  const cleaned: Record<string, unknown> = { ...body, app_id: appId };
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === "") {
      delete cleaned[key];
    }
  }
  // Prefer app-local channel name; if OneSignal rejects it we'll retry without.
  const res = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(cleaned),
  });

  let json = (await res.json().catch(() => null)) as {
    id?: string;
    errors?: unknown;
  } | null;

  // Retry without existing_android_channel_id if channel is unknown to OneSignal.
  if (
    !res.ok &&
    cleaned.existing_android_channel_id &&
    JSON.stringify(json).toLowerCase().includes("channel")
  ) {
    delete cleaned.existing_android_channel_id;
    const retry = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(cleaned),
    });
    json = (await retry.json().catch(() => null)) as typeof json;
    if (!retry.ok) {
      console.error("OneSignal push failed after channel retry", retry.status, json);
      return {
        ok: false as const,
        error: `OneSignal HTTP ${retry.status}`,
        details: json,
      };
    }
    if (json?.id) return { ok: true as const, id: json.id };
  }

  if (!res.ok) {
    console.error("OneSignal push failed", res.status, json);
    return {
      ok: false as const,
      error: `OneSignal HTTP ${res.status}`,
      details: json,
    };
  }

  // OneSignal may return 200 with errors when no subscribed recipients.
  if (json?.errors && !json?.id) {
    console.error("OneSignal push errors", json.errors);
    return { ok: false as const, error: "OneSignal reported delivery errors", details: json };
  }

  if (!json?.id) {
    console.error("OneSignal push returned empty id", json);
    return { ok: false as const, error: "OneSignal empty notification id", details: json };
  }

  return { ok: true as const, id: json.id };
}

export async function sendOneSignalPush(payload: PushContent & {
  externalIds: string[];
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const externalIds = [...new Set(payload.externalIds.filter(Boolean))];
  if (externalIds.length === 0) {
    console.error("OneSignal push skipped: no recipients");
    return { ok: false, error: "No recipients" };
  }

  const { body } = buildCommonFields(payload);
  return postOneSignal({
    ...body,
    include_aliases: { external_id: externalIds },
  });
}

/** Fallback / complement: target anyone currently tagged role=admin on a device. */
export async function sendOneSignalPushToRole(
  role: "admin" | "servant",
  payload: PushContent
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { body } = buildCommonFields(payload);
  return postOneSignal({
    ...body,
    filters: [
      { field: "tag", key: "role", relation: "=", value: role },
    ],
  });
}

export async function getActiveAdminUserIds(): Promise<string[]> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("is_active", true);

    if (error) {
      console.error("Failed to load admin ids for push", error);
      return [];
    }

    return (data ?? [])
      .filter((row) => row.id)
      .map((row) => row.id as string);
  } catch (e) {
    console.error("Admin client unavailable for push", e);
    return [];
  }
}

export function onesignalConfigStatus() {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ?? "";
  return {
    hasAppId: Boolean(appId),
    hasApiKey: Boolean(process.env.ONESIGNAL_REST_API_KEY),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    appIdSuffix: appId ? appId.slice(-8) : null,
  };
}
