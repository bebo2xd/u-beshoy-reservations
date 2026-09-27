-- Settings: notification prefs + Evolution WhatsApp config

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evolution_url text,
  ADD COLUMN IF NOT EXISTS evolution_api_key text,
  ADD COLUMN IF NOT EXISTS evolution_instance text,
  ADD COLUMN IF NOT EXISTS admin_whatsapp text;

UPDATE public.settings
SET notification_prefs = jsonb_build_object(
  'new_booking_telegram', true,
  'new_booking_email', true,
  'new_booking_whatsapp_admin', true,
  'decision_whatsapp_requester', true,
  'decision_whatsapp_admin', false,
  'cancel_whatsapp_requester', true,
  'cancel_whatsapp_admin', false,
  'admin_booking_whatsapp', false
)
WHERE id = 1
  AND (notification_prefs IS NULL OR notification_prefs = '{}'::jsonb);
