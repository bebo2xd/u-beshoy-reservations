const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) throw new Error("SUPABASE_DB_PASSWORD required");
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
    path.join(__dirname, "..", "supabase", "migrations", "0009_core_rooms.sql"),
    "utf8"
  );
  await client.query(sql);
  const { rows } = await client.query(
    "select count(*)::int as n from public.rooms where is_core"
  );
  console.log("migration 0009 applied; core rooms:", rows[0]?.n);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
