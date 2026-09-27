-- Configurable role defaults + per-profile permission overrides

CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  permission text NOT NULL,
  PRIMARY KEY (role, permission)
);

CREATE TABLE public.profile_permissions (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  PRIMARY KEY (profile_id, permission)
);

CREATE INDEX profile_permissions_profile_idx
  ON public.profile_permissions (profile_id);

-- Seed defaults
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'access_admin'),
  ('admin', 'book'),
  ('admin', 'view_own_bookings'),
  ('admin', 'decide_bookings'),
  ('admin', 'manage_calendar'),
  ('admin', 'manage_rooms'),
  ('admin', 'manage_schedules'),
  ('admin', 'manage_blackouts'),
  ('admin', 'manage_servants'),
  ('admin', 'manage_settings'),
  ('admin', 'manage_permissions'),
  ('servant', 'book'),
  ('servant', 'view_own_bookings')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.user_has_permission(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_override boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = v_uid
    AND p.is_active
    AND p.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT pp.granted INTO v_override
  FROM public.profile_permissions pp
  WHERE pp.profile_id = v_uid
    AND pp.permission = p_permission;

  IF FOUND THEN
    RETURN v_override;
  END IF;

  -- If user has ANY profile_permissions rows, treat as custom set:
  -- missing permission = denied (unless we only store overrides).
  -- We use "full custom set" model when custom flag row exists.
  IF EXISTS (
    SELECT 1 FROM public.profile_permissions pp
    WHERE pp.profile_id = v_uid AND pp.permission = '__custom__'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role = v_role AND rp.permission = p_permission
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_permission(text) TO authenticated;

-- Admin panel / RLS gate: access_admin or legacy admin role with defaults
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_permission('access_admin')
      OR public.user_has_permission('decide_bookings')
      OR public.user_has_permission('manage_rooms')
      OR public.user_has_permission('manage_schedules')
      OR public.user_has_permission('manage_blackouts')
      OR public.user_has_permission('manage_servants')
      OR public.user_has_permission('manage_settings')
      OR public.user_has_permission('manage_calendar')
      OR public.user_has_permission('manage_permissions');
$$;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_permissions_admin ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.user_has_permission('manage_permissions') OR public.user_has_permission('access_admin'))
  WITH CHECK (public.user_has_permission('manage_permissions'));

CREATE POLICY role_permissions_read ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profile_permissions_admin ON public.profile_permissions
  FOR ALL TO authenticated
  USING (
    public.user_has_permission('manage_permissions')
    OR public.user_has_permission('manage_servants')
    OR profile_id = auth.uid()
  )
  WITH CHECK (public.user_has_permission('manage_permissions') OR public.user_has_permission('manage_servants'));

CREATE POLICY profile_permissions_own_read ON public.profile_permissions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.user_has_permission('manage_permissions'));
