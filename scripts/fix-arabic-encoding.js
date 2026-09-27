const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Set SUPABASE_DB_PASSWORD env var first");
  process.exit(1);
}

async function main() {
  const client = new Client({
    host: "aws-0-eu-central-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.svffsuqbyjuznazuzxwi",
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const seedPath = path.join(__dirname, "..", "supabase", "seed.sql");
  const seed = fs.readFileSync(seedPath, "utf8").replace(/^\uFEFF/, "");
  await client.query(seed);
  console.log("seed applied");

  const notes = [
    "1. اجتماع الخدام الشهري: يوم الثلاثاء المحدد من الإدارة تتوقف كل الخدمات من الساعة 7 مساءً.",
    "2. الفصول تُفتح فقط بحضور المسؤولين (مجدي / إبراهيم / ميلاد). تسليم المفاتيح ممنوع نهائياً.",
    "3. لا يُسمح بتغيير المواعيد المتفق عليها دون الرجوع للمسؤولين لتفادي التداخل.",
    "4. التواصل بخصوص استخدام الأماكن يتم فقط عبر أمين الخدمة أو مساعده.",
    "5. يُغلق التكييف والمراوح بعد كل خدمة بواسطة المسؤول والخدام الحاضرين.",
  ].join("\n");

  await client.query(
    `UPDATE public.settings SET site_title = $1, important_notes = $2 WHERE id = 1`,
    ["حجز غرف مبنى الخدمات", notes]
  );

  const rooms = await client.query(
    "select name from rooms order by sort_order limit 5"
  );
  const settings = await client.query(
    "select site_title from settings where id = 1"
  );
  const schedule = await client.query(
    "select title from recurring_schedules order by id limit 1"
  );

  console.log("rooms:", rooms.rows.map((r) => r.name).join(" | "));
  console.log("title:", settings.rows[0].site_title);
  console.log("schedule:", schedule.rows[0]?.title);

  // Rebuild setup_all.sql with correct UTF-8 for future use
  const init = fs
    .readFileSync(path.join(__dirname, "..", "supabase", "migrations", "0001_init.sql"), "utf8")
    .replace(/^\uFEFF/, "");
  const drop = `-- FULL SETUP (UTF-8)
DROP VIEW IF EXISTS public.public_occupancy CASCADE;
DROP FUNCTION IF EXISTS public.create_booking_request CASCADE;
DROP FUNCTION IF EXISTS public.cancel_booking_by_code CASCADE;
DROP FUNCTION IF EXISTS public.get_booking_by_code CASCADE;
DROP FUNCTION IF EXISTS public.get_public_bookings CASCADE;
DROP FUNCTION IF EXISTS public.has_schedule_conflict CASCADE;
DROP FUNCTION IF EXISTS public.has_blackout_conflict CASCADE;
DROP FUNCTION IF EXISTS public.is_admin CASCADE;
DROP FUNCTION IF EXISTS public.generate_tracking_code CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at CASCADE;
DROP TABLE IF EXISTS public.schedule_exceptions CASCADE;
DROP TABLE IF EXISTS public.blackouts CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.recurring_schedules CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TYPE IF EXISTS public.booking_status CASCADE;

`;
  const seedBody = seed.replace(
    /DO \$\$[\s\S]*?END \$\$;\s*TRUNCATE[\s\S]*?CASCADE;\s*/m,
    ""
  );
  fs.writeFileSync(
    path.join(__dirname, "..", "supabase", "setup_all.sql"),
    drop + init + "\n\n-- ===== SEED =====\n\n" + seedBody,
    "utf8"
  );
  console.log("setup_all.sql rewritten as UTF-8");

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
