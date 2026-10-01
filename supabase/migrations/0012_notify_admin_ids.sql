-- Which admins receive admin-facing notifications (push / email / whatsapp).
-- NULL or empty = all active admins.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS notify_admin_ids uuid[] DEFAULT NULL;
