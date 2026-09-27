-- Tracking code format: YYYYMMDD-XXXX (X = digit 1–9)

CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := '123456789';
  result text := '';
  i int;
  prefix text;
BEGIN
  prefix := to_char((now() AT TIME ZONE 'Africa/Cairo')::date, 'YYYYMMDD');
  FOR i IN 1..4 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN prefix || '-' || result;
END;
$$;
