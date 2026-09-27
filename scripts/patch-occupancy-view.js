const { Client } = require("pg");

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("SUPABASE_DB_PASSWORD required");

  const c = new Client({
    host: "aws-0-eu-central-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.svffsuqbyjuznazuzxwi",
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });

  await c.connect();
  await c.query("SET client_encoding TO 'UTF8'");

  await c.query(`
CREATE OR REPLACE VIEW public.public_occupancy
WITH (security_invoker = false)
AS
SELECT r.id AS room_id, d.date::date AS date, rs.start_hour, rs.end_hour, rs.title,
  'recurring'::text AS kind, r.color, NULL::uuid AS booking_id, rs.id AS schedule_id,
  NULL::public.booking_status AS status, rs.needs_review
FROM public.rooms r
CROSS JOIN LATERAL (
  SELECT generate_series(CURRENT_DATE - 7, CURRENT_DATE + 60, '1 day'::interval)::date AS date
) d
JOIN public.recurring_schedules rs
  ON rs.room_id = r.id AND rs.is_active AND rs.deleted_at IS NULL
 AND rs.day_of_week = EXTRACT(DOW FROM d.date)::int
 AND (rs.valid_from IS NULL OR d.date >= rs.valid_from)
 AND (rs.valid_until IS NULL OR d.date <= rs.valid_until)
 AND NOT EXISTS (
   SELECT 1 FROM public.schedule_exceptions se
   WHERE se.recurring_schedule_id = rs.id AND se.exception_date = d.date
 )
WHERE r.is_active AND r.deleted_at IS NULL
UNION ALL
SELECT b.room_id, b.booking_date, b.start_hour, b.end_hour,
  CASE WHEN b.status = 'pending' THEN 'طلب قيد المراجعة' ELSE b.service_name END,
  CASE WHEN b.status = 'pending' THEN 'pending' ELSE 'booking' END,
  r.color, b.id, NULL::uuid, b.status, false
FROM public.bookings b
JOIN public.rooms r ON r.id = b.room_id
WHERE b.status IN ('pending', 'approved') AND r.deleted_at IS NULL
UNION ALL
SELECT COALESCE(bl.room_id, r.id), bl.date, bl.start_hour, bl.end_hour, bl.reason,
  'blackout'::text, '#8D8D86'::text, NULL::uuid, NULL::uuid, NULL::public.booking_status, false
FROM public.blackouts bl
JOIN public.rooms r ON bl.room_id IS NULL OR r.id = bl.room_id
WHERE r.is_active AND r.deleted_at IS NULL;
`);

  console.log("public_occupancy updated");
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
