-- Core rooms: can be deactivated, but not soft-deleted

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS is_core boolean NOT NULL DEFAULT false;

-- Seeded church rooms (fixed UUIDs from seed.sql)
UPDATE public.rooms
SET is_core = true
WHERE id IN (
  'a1000001-0000-4000-8000-000000000001',
  'a1000001-0000-4000-8000-000000000002',
  'a1000001-0000-4000-8000-000000000003',
  'a1000001-0000-4000-8000-000000000004',
  'a1000001-0000-4000-8000-000000000005',
  'a1000001-0000-4000-8000-000000000006',
  'a1000001-0000-4000-8000-000000000007',
  'a1000001-0000-4000-8000-000000000008',
  'a1000001-0000-4000-8000-000000000009',
  'a1000001-0000-4000-8000-00000000000a',
  'a1000001-0000-4000-8000-00000000000b',
  'a1000001-0000-4000-8000-00000000000c',
  'a1000001-0000-4000-8000-00000000000d'
);

-- Restore any core room that was soft-deleted by mistake
UPDATE public.rooms
SET deleted_at = NULL
WHERE is_core AND deleted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_core_room_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_core
     AND NEW.deleted_at IS NOT NULL
     AND OLD.deleted_at IS NULL THEN
    RAISE EXCEPTION 'لا يمكن حذف الأماكن الأساسية — يمكن إيقافها فقط';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_prevent_core_soft_delete ON public.rooms;
CREATE TRIGGER rooms_prevent_core_soft_delete
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_core_room_soft_delete();
