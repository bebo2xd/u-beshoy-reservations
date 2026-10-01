export type NotificationPrefs = {
  new_booking_telegram: boolean;
  new_booking_email: boolean;
  new_booking_whatsapp_admin: boolean;
  new_booking_push_admin: boolean;
  decision_whatsapp_requester: boolean;
  decision_whatsapp_admin: boolean;
  decision_push_requester: boolean;
  cancel_whatsapp_requester: boolean;
  cancel_whatsapp_admin: boolean;
  admin_booking_whatsapp: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  new_booking_telegram: true,
  new_booking_email: true,
  new_booking_whatsapp_admin: true,
  new_booking_push_admin: true,
  decision_whatsapp_requester: true,
  decision_whatsapp_admin: false,
  decision_push_requester: true,
  cancel_whatsapp_requester: true,
  cancel_whatsapp_admin: false,
  admin_booking_whatsapp: false,
};

export function mergeNotificationPrefs(
  raw?: Partial<NotificationPrefs> | null
): NotificationPrefs {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(raw ?? {}) };
}
