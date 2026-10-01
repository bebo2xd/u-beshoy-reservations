import { createAdminClient } from "@/lib/supabase/admin";

export type NotifyAdminRecipient = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
};

export type NotifyAdminRecipientsResult = {
  recipients: NotifyAdminRecipient[];
  /** true when settings limit to a subset (not "all admins") */
  restricted: boolean;
};

/** Active admins who should get admin notifications. Empty/null selection = all. */
export async function getNotifyAdminRecipients(): Promise<NotifyAdminRecipientsResult> {
  try {
    const admin = createAdminClient();
    const [{ data: settings }, { data: profiles, error }] = await Promise.all([
      admin.from("settings").select("notify_admin_ids").eq("id", 1).maybeSingle(),
      admin
        .from("profiles")
        .select("id, full_name, phone, email")
        .eq("role", "admin")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("full_name"),
    ]);

    if (error) {
      console.error("Failed to load admin recipients", error);
      return { recipients: [], restricted: false };
    }

    const all = (profiles ?? [])
      .filter((row) => row.id)
      .map((row) => ({
        id: row.id as string,
        full_name: (row.full_name as string) || "",
        phone: (row.phone as string) || "",
        email: (row.email as string | null) ?? null,
      }));

    const selected = (settings?.notify_admin_ids as string[] | null) ?? null;
    if (!selected || selected.length === 0) {
      return { recipients: all, restricted: false };
    }

    const allow = new Set(selected);
    const filtered = all.filter((a) => allow.has(a.id));
    // If selected IDs are stale/inactive, fall back to all so alerts don't vanish.
    if (filtered.length === 0) {
      return { recipients: all, restricted: false };
    }
    return { recipients: filtered, restricted: true };
  } catch (e) {
    console.error("Admin recipients unavailable", e);
    return { recipients: [], restricted: false };
  }
}

export async function listActiveAdmins(): Promise<NotifyAdminRecipient[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, phone, email")
      .eq("role", "admin")
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("full_name");

    if (error) {
      console.error("Failed to list admins", error);
      return [];
    }

    return (data ?? [])
      .filter((row) => row.id)
      .map((row) => ({
        id: row.id as string,
        full_name: (row.full_name as string) || "",
        phone: (row.phone as string) || "",
        email: (row.email as string | null) ?? null,
      }));
  } catch (e) {
    console.error("List admins unavailable", e);
    return [];
  }
}
