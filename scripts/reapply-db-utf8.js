/**
 * Re-applies schema + seed with correct UTF-8 encoding.
 * Usage: SUPABASE_DB_PASSWORD='...' node scripts/reapply-db-utf8.js
 */
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
  console.log("connected");

  // Ensure client session uses UTF-8
  await client.query("SET client_encoding TO 'UTF8'");

  const setupPath = path.join(__dirname, "..", "supabase", "setup_all.sql");
  const sql = fs.readFileSync(setupPath, "utf8").replace(/^\uFEFF/, "");

  // Sanity: file must contain correct Arabic before we apply
  if (!sql.includes("لا يمكن الحجز في تاريخ ماضي")) {
    throw new Error("setup_all.sql is missing correct Arabic — aborting");
  }
  if (sql.includes("Ù„Ø§")) {
    throw new Error("setup_all.sql still contains mojibake — aborting");
  }

  await client.query(sql);
  console.log("setup_all applied");

  // Verify function body encoding
  const fn = await client.query(
    `select prosrc from pg_proc where proname = 'create_booking_request' limit 1`
  );
  const src = fn.rows[0]?.prosrc || "";
  console.log("fn has correct Arabic:", src.includes("لا يمكن الحجز في تاريخ ماضي"));
  console.log("fn has mojibake:", src.includes("Ù„Ø§"));

  const rooms = await client.query(
    "select name from rooms order by sort_order limit 3"
  );
  console.log(
    "rooms:",
    rooms.rows.map((r) => r.name).join(" | ")
  );

  const settings = await client.query(
    "select site_title, left(important_notes, 40) as notes from settings where id = 1"
  );
  console.log("settings:", settings.rows[0]);

  await client.end();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
