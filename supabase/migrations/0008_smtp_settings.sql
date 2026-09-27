-- SMTP email settings (replaces Resend)

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS smtp_host text,
  ADD COLUMN IF NOT EXISTS smtp_port int DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_secure boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smtp_user text,
  ADD COLUMN IF NOT EXISTS smtp_password text,
  ADD COLUMN IF NOT EXISTS smtp_from text,
  ADD COLUMN IF NOT EXISTS admin_email text;
