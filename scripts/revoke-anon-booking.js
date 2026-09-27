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
    REVOKE ALL ON FUNCTION public.create_booking_request(
      uuid, date, smallint, smallint, text, text, text, text
    ) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.create_booking_request(
      uuid, date, smallint, smallint, text, text, text, text
    ) TO authenticated;

    REVOKE ALL ON FUNCTION public.cancel_booking_by_code(text) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.cancel_booking_by_code(text) TO authenticated;
  `);
  console.log("anon revoked from booking RPCs");
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
