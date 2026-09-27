-- Church building room reservations
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  floor text,
  color text NOT NULL DEFAULT '#12A594',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recurring_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_hour smallint NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour smallint NOT NULL CHECK (end_hour BETWEEN 1 AND 24),
  title text NOT NULL,
  notes text,
  needs_review boolean NOT NULL DEFAULT false,
  valid_from date,
  valid_until date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_hour > start_hour)
);

CREATE INDEX recurring_schedules_room_dow_idx
  ON public.recurring_schedules (room_id, day_of_week);

CREATE TABLE public.schedule_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_schedule_id uuid NOT NULL REFERENCES public.recurring_schedules(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_schedule_id, exception_date)
);

CREATE TABLE public.blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES public.rooms(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_hour smallint NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour smallint NOT NULL CHECK (end_hour BETWEEN 1 AND 24),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_hour > start_hour)
);

CREATE INDEX blackouts_date_idx ON public.blackouts (date);

CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  booking_date date NOT NULL,
  start_hour smallint NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour smallint NOT NULL CHECK (end_hour BETWEEN 1 AND 24),
  service_name text NOT NULL,
  requester_name text NOT NULL,
  requester_phone text NOT NULL,
  notes text,
  status public.booking_status NOT NULL DEFAULT 'pending',
  admin_note text,
  tracking_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_hour > start_hour)
);

CREATE INDEX bookings_room_date_idx ON public.bookings (room_id, booking_date);
CREATE INDEX bookings_status_idx ON public.bookings (status);
CREATE INDEX bookings_tracking_idx ON public.bookings (tracking_code);

-- Prevent double-booking of the same room/hour for active requests
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    booking_date WITH =,
    int4range(start_hour, end_hour, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'approved'));

CREATE TABLE public.settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  open_hour smallint NOT NULL DEFAULT 11,
  close_hour smallint NOT NULL DEFAULT 21,
  week_start_day smallint NOT NULL DEFAULT 5,
  max_weeks_ahead smallint NOT NULL DEFAULT 4,
  important_notes text NOT NULL DEFAULT '',
  site_title text NOT NULL DEFAULT 'حجز غرف مبنى الخدمات',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.settings (id, important_notes) VALUES (
  1,
  E'1. اجتماع الخدام الشهري: يوم الثلاثاء المحدد من الإدارة تتوقف كل الخدمات من الساعة 7 مساءً.\n2. الفصول تُفتح فقط بحضور المسؤولين (مجدي / إبراهيم / ميلاد). تسليم المفاتيح ممنوع نهائياً.\n3. لا يُسمح بتغيير المواعيد المتفق عليها دون الرجوع للمسؤولين لتفادي التداخل.\n4. التواصل بخصوص استخدام الأماكن يتم فقط عبر أمين الخدمة أو مساعده.\n5. يُغلق التكييف والمراوح بعد كل خدمة بواسطة المسؤول والخدام الحاضرين.'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'authenticated';
$$;

-- ---------------------------------------------------------------------------
-- Conflict checks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_schedule_conflict(
  p_room_id uuid,
  p_date date,
  p_start smallint,
  p_end smallint
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dow int := EXTRACT(DOW FROM p_date)::int;
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.recurring_schedules rs
    WHERE rs.room_id = p_room_id
      AND rs.is_active
      AND rs.day_of_week = dow
      AND rs.start_hour < p_end
      AND p_start < rs.end_hour
      AND (rs.valid_from IS NULL OR p_date >= rs.valid_from)
      AND (rs.valid_until IS NULL OR p_date <= rs.valid_until)
      AND NOT EXISTS (
        SELECT 1 FROM public.schedule_exceptions se
        WHERE se.recurring_schedule_id = rs.id
          AND se.exception_date = p_date
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_blackout_conflict(
  p_room_id uuid,
  p_date date,
  p_start smallint,
  p_end smallint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blackouts b
    WHERE b.date = p_date
      AND (b.room_id IS NULL OR b.room_id = p_room_id)
      AND b.start_hour < p_end
      AND p_start < b.end_hour
  );
$$;

-- ---------------------------------------------------------------------------
-- Public occupancy view (no PII)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.public_occupancy
WITH (security_invoker = false)
AS
SELECT
  r.id AS room_id,
  d.date::date AS date,
  rs.start_hour,
  rs.end_hour,
  rs.title,
  'recurring'::text AS kind,
  r.color,
  NULL::uuid AS booking_id,
  rs.id AS schedule_id,
  NULL::public.booking_status AS status,
  rs.needs_review
FROM public.rooms r
CROSS JOIN LATERAL (
  SELECT generate_series(
    CURRENT_DATE - 7,
    CURRENT_DATE + 60,
    '1 day'::interval
  )::date AS date
) d
JOIN public.recurring_schedules rs
  ON rs.room_id = r.id
 AND rs.is_active
 AND rs.day_of_week = EXTRACT(DOW FROM d.date)::int
 AND (rs.valid_from IS NULL OR d.date >= rs.valid_from)
 AND (rs.valid_until IS NULL OR d.date <= rs.valid_until)
 AND NOT EXISTS (
   SELECT 1 FROM public.schedule_exceptions se
   WHERE se.recurring_schedule_id = rs.id AND se.exception_date = d.date
 )
WHERE r.is_active

UNION ALL

SELECT
  b.room_id,
  b.booking_date AS date,
  b.start_hour,
  b.end_hour,
  CASE WHEN b.status = 'pending' THEN 'طلب قيد المراجعة' ELSE b.service_name END AS title,
  CASE WHEN b.status = 'pending' THEN 'pending' ELSE 'booking' END AS kind,
  r.color,
  b.id AS booking_id,
  NULL::uuid AS schedule_id,
  b.status,
  false AS needs_review
FROM public.bookings b
JOIN public.rooms r ON r.id = b.room_id
WHERE b.status IN ('pending', 'approved')

UNION ALL

SELECT
  COALESCE(bl.room_id, r.id) AS room_id,
  bl.date,
  bl.start_hour,
  bl.end_hour,
  bl.reason AS title,
  'blackout'::text AS kind,
  '#8D8D86'::text AS color,
  NULL::uuid AS booking_id,
  NULL::uuid AS schedule_id,
  NULL::public.booking_status AS status,
  false AS needs_review
FROM public.blackouts bl
JOIN public.rooms r ON bl.room_id IS NULL OR r.id = bl.room_id
WHERE r.is_active;

GRANT SELECT ON public.public_occupancy TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: create booking request
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_booking_request(
  p_room_id uuid,
  p_date date,
  p_start_hour smallint,
  p_end_hour smallint,
  p_service_name text,
  p_requester_name text,
  p_requester_phone text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.settings%ROWTYPE;
  v_code text;
  v_id uuid;
  v_today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  v_phone text;
  v_recent int;
BEGIN
  SELECT * INTO v_settings FROM public.settings WHERE id = 1;

  IF p_service_name IS NULL OR length(trim(p_service_name)) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'اسم الخدمة مطلوب');
  END IF;
  IF p_requester_name IS NULL OR length(trim(p_requester_name)) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الاسم مطلوب');
  END IF;
  IF p_requester_phone IS NULL OR length(regexp_replace(p_requester_phone, '\D', '', 'g')) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'رقم التليفون غير صحيح');
  END IF;

  IF p_start_hour < v_settings.open_hour OR p_end_hour > v_settings.close_hour THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الحجز خارج ساعات العمل المسموحة');
  END IF;
  IF p_end_hour <= p_start_hour THEN
    RETURN jsonb_build_object('ok', false, 'error', 'وقت النهاية يجب أن يكون بعد البداية');
  END IF;
  IF p_date < v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'لا يمكن الحجز في تاريخ ماضي');
  END IF;
  IF p_date > v_today + (v_settings.max_weeks_ahead * 7) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'التاريخ أبعد من المدة المسموحة');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND is_active) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'المكان غير متاح');
  END IF;

  IF public.has_schedule_conflict(p_room_id, p_date, p_start_hour, p_end_hour) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الموعد يتعارض مع موعد ثابت');
  END IF;

  IF public.has_blackout_conflict(p_room_id, p_date, p_start_hour, p_end_hour) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الموعد مقفول في هذا الوقت');
  END IF;

  v_phone := regexp_replace(p_requester_phone, '\D', '', 'g');
  SELECT count(*) INTO v_recent
  FROM public.bookings
  WHERE requester_phone = v_phone
    AND created_at > now() - interval '1 hour'
    AND status = 'pending';
  IF v_recent >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'تم إرسال طلبات كثيرة. حاول لاحقاً');
  END IF;

  -- Generate unique tracking code
  LOOP
    v_code := public.generate_tracking_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE tracking_code = v_code);
  END LOOP;

  BEGIN
    INSERT INTO public.bookings (
      room_id, booking_date, start_hour, end_hour,
      service_name, requester_name, requester_phone, notes,
      status, tracking_code
    ) VALUES (
      p_room_id, p_date, p_start_hour, p_end_hour,
      trim(p_service_name), trim(p_requester_name), v_phone, nullif(trim(p_notes), ''),
      'pending', v_code
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'هذا الموعد محجوز بالفعل');
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'tracking_code', v_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking_request TO anon, authenticated;

-- Cancel by tracking code (requester)
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

GRANT EXECUTE ON FUNCTION public.cancel_booking_by_code TO anon, authenticated;

-- Public tracking lookup (limited fields)
CREATE OR REPLACE FUNCTION public.get_booking_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT
    b.id, b.booking_date, b.start_hour, b.end_hour, b.service_name,
    b.requester_name, b.status, b.admin_note, b.tracking_code, b.created_at,
    r.name AS room_name, r.color AS room_color
  INTO v_row
  FROM public.bookings b
  JOIN public.rooms r ON r.id = b.room_id
  WHERE b.tracking_code = upper(trim(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الطلب غير موجود');
  END IF;

  RETURN jsonb_build_object('ok', true, 'booking', to_jsonb(v_row));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_by_code TO anon, authenticated;

-- Public bookings occupancy (no PII)
CREATE OR REPLACE FUNCTION public.get_public_bookings(p_from date, p_to date)
RETURNS TABLE (
  id uuid,
  room_id uuid,
  booking_date date,
  start_hour smallint,
  end_hour smallint,
  service_name text,
  status public.booking_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.room_id,
    b.booking_date,
    b.start_hour,
    b.end_hour,
    CASE WHEN b.status = 'pending' THEN 'طلب قيد المراجعة' ELSE b.service_name END,
    b.status
  FROM public.bookings b
  WHERE b.booking_date BETWEEN p_from AND p_to
    AND b.status IN ('pending', 'approved');
$$;

GRANT EXECUTE ON FUNCTION public.get_public_bookings TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Rooms: public read active, admin all
CREATE POLICY rooms_public_read ON public.rooms
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());

CREATE POLICY rooms_admin_all ON public.rooms
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Recurring schedules: public read active
CREATE POLICY schedules_public_read ON public.recurring_schedules
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());

CREATE POLICY schedules_admin_all ON public.recurring_schedules
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY exceptions_public_read ON public.schedule_exceptions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY exceptions_admin_all ON public.schedule_exceptions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY blackouts_public_read ON public.blackouts
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY blackouts_admin_all ON public.blackouts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Bookings: admin full access; anon cannot select directly (use RPC)
CREATE POLICY bookings_admin_all ON public.bookings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY settings_public_read ON public.settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY settings_admin_update ON public.settings
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
