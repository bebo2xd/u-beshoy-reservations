import { NextRequest, NextResponse } from "next/server";
import {
  getActiveAdminUserIds,
  onesignalConfigStatus,
  sendOneSignalPush,
  sendOneSignalPushToRole,
} from "@/lib/notify/onesignal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic + manual test endpoint for OneSignal.
 * GET  /api/push/health
 * POST /api/push/health  { "secret": "<CRON_SECRET>" }  → sends a test push to admins
 */
export async function GET() {
  const status = onesignalConfigStatus();
  let adminIds: string[] = [];
  let adminError: string | null = null;
  try {
    adminIds = await getActiveAdminUserIds();
  } catch (e) {
    adminError = e instanceof Error ? e.message : "admin query failed";
  }

  return NextResponse.json({
    ok: true,
    onesignal: status,
    adminIds,
    adminCount: adminIds.length,
    adminError,
  });
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  const body = (await req.json().catch(() => ({}))) as { secret?: string };
  const headerSecret = req.headers.get("x-cron-secret");
  const provided = body.secret || headerSecret || "";

  const authorized =
    (cronSecret && provided === cronSecret) ||
    (apiKey && provided === apiKey) ||
    (!cronSecret && !apiKey && process.env.NODE_ENV !== "production");

  if (!authorized) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const adminIds = await getActiveAdminUserIds();
  const payload = {
    heading: "اختبار Push",
    body: "إشعار تجريبي من السيرفر — حجوزات الكنيسة",
    url: "/admin",
    data: { test: "1" },
  };

  let result: { ok: boolean; error?: string; id?: string; details?: unknown };
  let method: "aliases" | "role_tag" = "aliases";

  if (adminIds.length > 0) {
    result = await sendOneSignalPush({ ...payload, externalIds: adminIds });
    if (!result.ok) {
      method = "role_tag";
      result = await sendOneSignalPushToRole("admin", payload);
    }
  } else {
    method = "role_tag";
    result = await sendOneSignalPushToRole("admin", payload);
  }

  return NextResponse.json({
    ok: result.ok,
    config: onesignalConfigStatus(),
    adminIds,
    method,
    result,
  });
}
