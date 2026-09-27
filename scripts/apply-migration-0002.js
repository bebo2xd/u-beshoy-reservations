const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Set SUPABASE_DB_PASSWORD");
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
  await client.query("SET client_encoding TO 'UTF8'");
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "0002_soft_delete_sort.sql"),
    "utf8"
  );
  await client.query(sql);
  const check = await client.query(
    "select count(*)::int as n from recurring_schedules where sort_order > 0"
  );
  console.log("migration 0002 applied, sorted schedules:", check.rows[0].n);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
