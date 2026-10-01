import { Capacitor } from "@capacitor/core";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function getOneSignal() {
  if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
    return null;
  }
  const mod = await import("onesignal-cordova-plugin");
  return mod.default;
}

export function resolvePushDeepLink(
  data?: Record<string, unknown> | null,
  launchURL?: string | null
): string | null {
  const fromData = data?.url;
  if (typeof fromData === "string" && fromData.trim()) {
    return normalizeAppPath(fromData.trim());
  }
  if (launchURL?.trim()) {
    return normalizeAppPath(launchURL.trim());
  }
  return null;
}

export function toE164Phone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "").trim();
  if (!digits) return null;

  if (digits.startsWith("+")) {
    const only = `+${digits.slice(1).replace(/\D/g, "")}`;
    return only.length >= 11 ? only : null;
  }

  const nums = digits.replace(/\D/g, "");
  if (nums.startsWith("00") && nums.length > 4) {
    return `+${nums.slice(2)}`;
  }
  if (nums.startsWith("20") && nums.length >= 11) {
    return `+${nums}`;
  }
  if (nums.startsWith("0") && nums.length >= 10) {
    return `+20${nums.slice(1)}`;
  }
  if (nums.length >= 9 && nums.length <= 11) {
    return `+20${nums}`;
  }
  return null;
}

function normalizeAppPath(raw: string): string {
  if (raw.startsWith("/")) return raw;
  try {
    const url = new URL(raw);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return raw.startsWith("http") ? "/" : `/${raw.replace(/^\//, "")}`;
  }
}
