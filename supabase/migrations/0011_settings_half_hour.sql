-- Allow half-hour open/close hours in settings (depends on slot duration)

ALTER TABLE public.settings
  ALTER COLUMN open_hour TYPE numeric(4,1) USING open_hour::numeric(4,1),
  ALTER COLUMN close_hour TYPE numeric(4,1) USING close_hour::numeric(4,1);

NOTIFY pgrst, 'reload schema';
