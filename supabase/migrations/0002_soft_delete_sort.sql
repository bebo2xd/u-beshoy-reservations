-- Soft delete + sort order for rooms & recurring schedules

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.recurring_schedules
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Backfill schedule sort by day then start hour
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (
    ORDER BY day_of_week, start_hour, title
  ) AS rn
  FROM public.recurring_schedules
)
UPDATE public.recurring_schedules s
SET sort_order = ordered.rn
FROM ordered
WHERE s.id = ordered.id;

CREATE INDEX IF NOT EXISTS rooms_deleted_at_idx ON public.rooms (deleted_at);
CREATE INDEX IF NOT EXISTS rooms_sort_order_idx ON public.rooms (sort_order);
CREATE INDEX IF NOT EXISTS schedules_deleted_at_idx ON public.recurring_schedules (deleted_at);
CREATE INDEX IF NOT EXISTS schedules_sort_order_idx ON public.recurring_schedules (sort_order);

-- Public reads: exclude soft-deleted
DROP POLICY IF EXISTS rooms_public_read ON public.rooms;
CREATE POLICY rooms_public_read ON public.rooms
  FOR SELECT TO anon, authenticated
  USING (
    (deleted_at IS NULL AND is_active)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS schedules_public_read ON public.recurring_schedules;
CREATE POLICY schedules_public_read ON public.recurring_schedules
  FOR SELECT TO anon, authenticated
  USING (
    (deleted_at IS NULL AND is_active)
    OR public.is_admin()
  );

-- Booking conflict / availability helpers should ignore soft-deleted
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

  v_phone := regexp_replace(p_requester_phone, '\D', '', 'g');
  SELECT count(*) INTO v_recent
  FROM public.bookings
  WHERE requester_phone = v_phone
    AND created_at > now() - interval '1 hour'
    AND status = 'pending';
  IF v_recent >= 5 THEN
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

-- Occupancy view: exclude soft-deleted rooms/schedules
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
SELECT COALESCE(bl.room_id, r.id), bl.date, bl.start_hour, bl.end_hour, bl.reason,
  'blackout'::text, '#8D8D86'::text, NULL::uuid, NULL::uuid, NULL::public.booking_status, false
FROM public.blackouts bl
JOIN public.rooms r ON bl.room_id IS NULL OR r.id = bl.room_id
WHERE r.is_active AND r.deleted_at IS NULL;

GRANT SELECT ON public.public_occupancy TO anon, authenticated;
