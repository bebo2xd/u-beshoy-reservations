const { Client } = require("pg");

async function main() {
  const c = new Client({
    host: "aws-0-eu-central-1.pooler.supabase.com",
    port: 5432,
    user: "postgres.svffsuqbyjuznazuzxwi",
    password: process.env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query(`
    UPDATE public.profiles
    SET phone = '01000000000'
    WHERE role = 'admin'
      AND length(regexp_replace(coalesce(phone, ''), '\\D', '', 'g')) < 10
  `);
  const r = await c.query(
    "select full_name, email, role, phone, is_active from profiles"
  );
  console.log(r.rows);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
