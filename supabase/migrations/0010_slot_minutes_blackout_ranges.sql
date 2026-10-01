-- Slot duration setting + blackout date ranges / hide whole days
-- + half-hour support via numeric hour columns (11.5 = 11:30)

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS slot_duration_minutes smallint NOT NULL DEFAULT 60;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settings_slot_duration_minutes_check'
  ) THEN
    ALTER TABLE public.settings
      ADD CONSTRAINT settings_slot_duration_minutes_check
      CHECK (slot_duration_minutes IN (30, 60));
  END IF;
END $$;

-- Half-hour open/close (e.g. 11.5–20.5)
ALTER TABLE public.settings
  ALTER COLUMN open_hour TYPE numeric(4,1) USING open_hour::numeric(4,1),
  ALTER COLUMN close_hour TYPE numeric(4,1) USING close_hour::numeric(4,1);

ALTER TABLE public.blackouts
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS hide_day boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.blackouts.end_date IS
  'Inclusive end of range; NULL means single-day blackout (date only).';
COMMENT ON COLUMN public.blackouts.hide_day IS
  'When true, hide matching calendar days from the public booking UI.';

DROP FUNCTION IF EXISTS public.has_schedule_conflict(uuid, date, smallint, smallint);
DROP FUNCTION IF EXISTS public.has_blackout_conflict(uuid, date, smallint, smallint);
DROP FUNCTION IF EXISTS public.has_schedule_conflict(uuid, date, integer, integer);
DROP FUNCTION IF EXISTS public.has_blackout_conflict(uuid, date, integer, integer);

-- View depends on hour columns — drop before type change
DROP VIEW IF EXISTS public.public_occupancy;

-- ---------------------------------------------------------------------------
-- Convert hour columns to numeric so 11.5 (half-hour) is allowed
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;

ALTER TABLE public.bookings
  ALTER COLUMN start_hour TYPE numeric(4,1) USING start_hour::numeric(4,1),
  ALTER COLUMN end_hour TYPE numeric(4,1) USING end_hour::numeric(4,1);

ALTER TABLE public.blackouts
  ALTER COLUMN start_hour TYPE numeric(4,1) USING start_hour::numeric(4,1),
  ALTER COLUMN end_hour TYPE numeric(4,1) USING end_hour::numeric(4,1);

ALTER TABLE public.recurring_schedules
  ALTER COLUMN start_hour TYPE numeric(4,1) USING start_hour::numeric(4,1),
  ALTER COLUMN end_hour TYPE numeric(4,1) USING end_hour::numeric(4,1);

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    booking_date WITH =,
    numrange(start_hour, end_hour, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'approved'));

-- Conflict helpers accept numeric hours
CREATE OR REPLACE FUNCTION public.has_schedule_conflict(
  p_room_id uuid,
  p_date date,
  p_start numeric,
  p_end numeric
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
      AND rs.deleted_at IS NULL
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
  p_start numeric,
  p_end numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blackouts b
    WHERE p_date >= b.date
      AND p_date <= COALESCE(b.end_date, b.date)
      AND (b.room_id IS NULL OR b.room_id = p_room_id)
      AND b.start_hour < p_end
      AND p_start < b.end_hour
  );
$$;

-- Recreate booking RPC with numeric hours + slot alignment
DROP FUNCTION IF EXISTS public.create_booking_request(
  uuid, date, smallint, smallint, text, text, text, text
);

CREATE OR REPLACE FUNCTION public.create_booking_request(
  p_room_id uuid,
  p_date date,
  p_start_hour numeric,
  p_end_hour numeric,
  p_service_name text,
  p_requester_name text DEFAULT NULL,
  p_requester_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.settings%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_code text;
  v_id uuid;
  v_today date := (now() AT TIME ZONE 'Africa/Cairo')::date;
  v_phone text;
  v_name text;
  v_recent int;
  v_slot numeric;
  v_open numeric;
  v_close numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'يجب تسجيل الدخول للحجز');
  END IF;

  SELECT * INTO v_profile FROM public.profiles
  WHERE id = auth.uid() AND is_active AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'حسابك غير مفعّل. تواصل مع الإدارة');
  END IF;

  SELECT * INTO v_settings FROM public.settings WHERE id = 1;

  IF p_service_name IS NULL OR length(trim(p_service_name)) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'اسم الخدمة مطلوب');
  END IF;

  v_name := coalesce(nullif(trim(p_requester_name), ''), v_profile.full_name);
  v_phone := regexp_replace(
    coalesce(nullif(trim(p_requester_phone), ''), v_profile.phone),
    '\D', '', 'g'
  );

  IF length(v_name) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الاسم مطلوب');
  END IF;
  IF length(v_phone) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'رقم التليفون غير صحيح — حدّث بياناتك من الإدارة');
  END IF;

  v_slot := COALESCE(v_settings.slot_duration_minutes, 60)::numeric / 60.0;
  v_open := v_settings.open_hour::numeric;
  v_close := v_settings.close_hour::numeric;

  IF p_start_hour < v_open OR p_end_hour > v_close THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الحجز خارج ساعات العمل المسموحة');
  END IF;
  IF p_end_hour <= p_start_hour THEN
    RETURN jsonb_build_object('ok', false, 'error', 'وقت النهاية يجب أن يكون بعد البداية');
  END IF;

  -- Align to slot duration (allow tiny float noise)
  IF abs(mod(p_start_hour / v_slot, 1)) > 0.001
     OR abs(mod(p_end_hour / v_slot, 1)) > 0.001 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الوقت غير متوافق مع مدة الفترة المحددة');
  END IF;

  IF p_date < v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'لا يمكن الحجز في تاريخ ماضي');
  END IF;
  IF p_date > v_today + (v_settings.max_weeks_ahead * 7) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'التاريخ أبعد من المدة المسموحة');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = p_room_id AND is_active AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'المكان غير متاح');
  END IF;

  IF public.has_schedule_conflict(p_room_id, p_date, p_start_hour, p_end_hour) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الموعد يتعارض مع موعد ثابت');
  END IF;

  IF public.has_blackout_conflict(p_room_id, p_date, p_start_hour, p_end_hour) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الموعد مقفول في هذا الوقت');
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.bookings
  WHERE created_by = auth.uid()
    AND created_at > now() - interval '1 hour'
    AND status = 'pending';
  IF v_recent >= 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'تم إرسال طلبات كثيرة. حاول لاحقاً');
  END IF;

  LOOP
    v_code := public.generate_tracking_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE tracking_code = v_code);
  END LOOP;

  BEGIN
    INSERT INTO public.bookings (
      room_id, booking_date, start_hour, end_hour,
      service_name, requester_name, requester_phone, notes,
      status, tracking_code, created_by
    ) VALUES (
      p_room_id, p_date, p_start_hour, p_end_hour,
      trim(p_service_name), v_name, v_phone, nullif(trim(p_notes), ''),
      'pending', v_code, auth.uid()
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

REVOKE ALL ON FUNCTION public.create_booking_request(
  uuid, date, numeric, numeric, text, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_request(
  uuid, date, numeric, numeric, text, text, text, text
) TO authenticated;

-- Occupancy view: expand blackout date ranges to each day
CREATE OR REPLACE VIEW public.public_occupancy
WITH (security_invoker = false)
AS
SELECT r.id AS room_id, d.date::date AS date, rs.start_hour, rs.end_hour, rs.title,
  'recurring'::text AS kind, r.color, NULL::uuid AS booking_id, rs.id AS schedule_id,
  NULL::public.booking_status AS status, rs.needs_review
FROM public.rooms r
CROSS JOIN LATERAL (
  SELECT generate_series(CURRENT_DATE - 7, CURRENT_DATE + 60, '1 day'::interval)::date AS date
) d
JOIN public.recurring_schedules rs
  ON rs.room_id = r.id AND rs.is_active AND rs.deleted_at IS NULL
 AND rs.day_of_week = EXTRACT(DOW FROM d.date)::int
 AND (rs.valid_from IS NULL OR d.date >= rs.valid_from)
 AND (rs.valid_until IS NULL OR d.date <= rs.valid_until)
 AND NOT EXISTS (
   SELECT 1 FROM public.schedule_exceptions se
   WHERE se.recurring_schedule_id = rs.id AND se.exception_date = d.date
 )
WHERE r.is_active AND r.deleted_at IS NULL
UNION ALL
SELECT b.room_id, b.booking_date, b.start_hour, b.end_hour,
  CASE WHEN b.status = 'pending' THEN 'طلب قيد المراجعة' ELSE b.service_name END,
  CASE WHEN b.status = 'pending' THEN 'pending' ELSE 'booking' END,
  r.color, b.id, NULL::uuid, b.status, false
FROM public.bookings b
JOIN public.rooms r ON r.id = b.room_id
WHERE b.status IN ('pending', 'approved') AND r.deleted_at IS NULL
UNION ALL
SELECT COALESCE(bl.room_id, r.id), d.date, bl.start_hour, bl.end_hour, bl.reason,
  'blackout'::text, '#8D8D86'::text, NULL::uuid, NULL::uuid, NULL::public.booking_status, false
FROM public.blackouts bl
CROSS JOIN LATERAL (
  SELECT generate_series(
    bl.date,
    COALESCE(bl.end_date, bl.date),
    '1 day'::interval
  )::date AS date
) d
JOIN public.rooms r ON bl.room_id IS NULL OR r.id = bl.room_id
WHERE r.is_active AND r.deleted_at IS NULL;

GRANT SELECT ON public.public_occupancy TO anon, authenticated;

-- Refresh PostgREST schema cache (fixes "column not in schema cache")
NOTIFY pgrst, 'reload schema';
