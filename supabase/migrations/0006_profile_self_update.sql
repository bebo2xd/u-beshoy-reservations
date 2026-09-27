-- Allow users to update their own profile (name, phone, email) — not role/active

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND is_active = (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
    AND deleted_at IS NOT DISTINCT FROM (SELECT p.deleted_at FROM public.profiles p WHERE p.id = auth.uid())
  );
