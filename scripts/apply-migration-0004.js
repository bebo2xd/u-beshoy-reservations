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
    path.join(__dirname, "..", "supabase", "migrations", "0004_permissions.sql"),
    "utf8"
  );
  await client.query(sql);
  const check = await client.query(
    "select role, count(*)::int as n from role_permissions group by role order by role"
  );
  console.log("migration 0004 applied", check.rows);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
