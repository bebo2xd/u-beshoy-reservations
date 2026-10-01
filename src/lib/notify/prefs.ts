export type NotificationPrefs = {
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
  raw?: Partial<NotificationPrefs> | Record<string, unknown> | null
): NotificationPrefs {
  const merged = { ...DEFAULT_NOTIFICATION_PREFS, ...(raw ?? {}) } as Record<
    string,
    unknown
  >;
  // Drop legacy telegram flag if present in stored JSON
  delete merged.new_booking_telegram;
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...(merged as Partial<NotificationPrefs>),
  };
}
