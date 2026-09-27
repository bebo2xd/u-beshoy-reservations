import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Missing env" }, { status: 500 });
  }

  const supabase = createClient(url, key);
  const { error } = await supabase.from("settings").select("id").limit(1);

  return NextResponse.json({
    ok: !error,
    at: new Date().toISOString(),
    error: error?.message,
  });
}
