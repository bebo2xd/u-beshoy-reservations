-- Arabic UI font selected from admin settings

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS ui_font text NOT NULL DEFAULT 'tajawal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'settings_ui_font_check'
  ) THEN
    ALTER TABLE public.settings
      ADD CONSTRAINT settings_ui_font_check
      CHECK (ui_font IN (
        'tajawal',
        'cairo',
        'ibm-plex',
        'almarai',
        'readex',
        'el-messiri'
      ));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
