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
CREATE OR REPLACE FUNCTION public.cancel_booking_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE tracking_code = upper(trim(p_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الطلب غير موجود');
  END IF;

  IF NOT (
    public.is_admin()
    OR (auth.uid() IS NOT NULL AND v_booking.created_by = auth.uid())
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'غير مصرح بإلغاء هذا الطلب');
  END IF;

  IF v_booking.status NOT IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'لا يمكن إلغاء هذا الطلب');
  END IF;
  IF v_booking.booking_date < (now() AT TIME ZONE 'Africa/Cairo')::date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'لا يمكن إلغاء حجز سابق');
  END IF;

  UPDATE public.bookings SET status = 'cancelled', updated_at = now()
  WHERE id = v_booking.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
  `);
  console.log("cancel policy tightened");
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
