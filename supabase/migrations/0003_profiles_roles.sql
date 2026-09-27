-- Profiles, roles, authenticated-only booking

CREATE TYPE public.app_role AS ENUM ('admin', 'servant');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text,
  role public.app_role NOT NULL DEFAULT 'servant',
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_role_idx ON public.profiles (role);
CREATE INDEX profiles_deleted_at_idx ON public.profiles (deleted_at);
CREATE INDEX profiles_active_idx ON public.profiles (is_active) WHERE deleted_at IS NULL;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS bookings_created_by_idx ON public.bookings (created_by);

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.is_active
      AND p.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active
      AND p.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_servant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'servant'
      AND p.is_active
      AND p.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.* FROM public.profiles p WHERE p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Booking RPC: authenticated servants/admins only
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_booking_request(
  p_room_id uuid,
  p_date date,
  p_start_hour smallint,
  p_end_hour smallint,
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
  uuid, date, smallint, smallint, text, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_request(
  uuid, date, smallint, smallint, text, text, text, text
) TO authenticated;

-- Cancel: owner by code, or admin, or created_by match
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

REVOKE ALL ON FUNCTION public.cancel_booking_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_bookings()
RETURNS SETOF public.bookings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.*
  FROM public.bookings b
  WHERE b.created_by = auth.uid()
  ORDER BY b.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_bookings TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS for profiles + bookings own rows
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS bookings_admin_all ON public.bookings;
CREATE POLICY bookings_admin_all ON public.bookings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY bookings_own_select ON public.bookings
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- Seed admin profile for existing admin user
INSERT INTO public.profiles (id, full_name, phone, email, role, is_active)
SELECT u.id, 'مسؤول النظام', '01000000000', u.email, 'admin'::public.app_role, true
FROM auth.users u
WHERE lower(u.email) = 'admin@beshoy.local'
ON CONFLICT (id) DO UPDATE
SET role = 'admin',
    is_active = true,
    deleted_at = null,
    full_name = EXCLUDED.full_name,
    phone = CASE
      WHEN length(regexp_replace(coalesce(public.profiles.phone, ''), '\D', '', 'g')) < 10
      THEN EXCLUDED.phone
      ELSE public.profiles.phone
    END;
