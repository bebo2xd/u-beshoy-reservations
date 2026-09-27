import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole, Profile } from "@/lib/types";
import {
  CUSTOM_FLAG,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_KEYS,
  type PermissionKey,
} from "@/lib/permissions";

export type SessionProfile = Profile & { email?: string | null };

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getProfile(): Promise<SessionProfile | null> {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!data || data.deleted_at || !data.is_active) return null;
  return data as SessionProfile;
}

export async function getUserPermissions(
  profileId?: string,
  role?: AppRole
): Promise<Set<PermissionKey>> {
  const { supabase, user } = await getSessionUser();
  const id = profileId ?? user?.id;
  if (!id) return new Set();

  let resolvedRole = role;
  if (!resolvedRole) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();
    resolvedRole = (data?.role as AppRole | undefined) ?? "servant";
  }

  // Prefer RPC when checking current user (respects SECURITY DEFINER)
  if (!profileId || profileId === user?.id) {
    const granted = new Set<PermissionKey>();
    await Promise.all(
      PERMISSION_KEYS.map(async (key) => {
        const { data } = await supabase.rpc("user_has_permission", {
          p_permission: key,
        });
        if (data === true) granted.add(key);
      })
    );
    return granted;
  }

  // Admin viewing another profile: compute from tables via service role
  const admin = createAdminClient();
  const { data: overrides } = await admin
    .from("profile_permissions")
    .select("permission, granted")
    .eq("profile_id", id);

  const rows = overrides ?? [];
  const isCustom = rows.some((r) => r.permission === CUSTOM_FLAG);
  if (isCustom) {
    return new Set(
      rows
        .filter((r) => r.permission !== CUSTOM_FLAG && r.granted)
        .map((r) => r.permission as PermissionKey)
    );
  }

  const { data: rolePerms } = await admin
    .from("role_permissions")
    .select("permission")
    .eq("role", resolvedRole);

  const set = new Set(
    (rolePerms ?? []).map((r) => r.permission as PermissionKey)
  );
  for (const row of rows) {
    if (row.permission === CUSTOM_FLAG) continue;
    if (row.granted) set.add(row.permission as PermissionKey);
    else set.delete(row.permission as PermissionKey);
  }
  if (set.size === 0) {
    return new Set(DEFAULT_ROLE_PERMISSIONS[resolvedRole] ?? []);
  }
  return set;
}

export async function requireAuth() {
  const profile = await getProfile();
  if (!profile) {
    return {
      ok: false as const,
      error: "يجب تسجيل الدخول",
      profile: null,
      supabase: null,
    };
  }
  const supabase = await createClient();
  return { ok: true as const, profile, supabase, error: null };
}

export async function requirePermission(permission: PermissionKey) {
  const result = await requireAuth();
  if (!result.ok || !result.supabase) return result;

  const { data } = await result.supabase.rpc("user_has_permission", {
    p_permission: permission,
  });

  if (data !== true) {
    return {
      ok: false as const,
      error: "غير مصرح لهذه العملية",
      profile: null,
      supabase: null,
    };
  }
  return result;
}

/** Panel access: any management permission */
export async function requireAdmin() {
  const result = await requireAuth();
  if (!result.ok || !result.supabase) return result;

  const { data } = await result.supabase.rpc("user_has_permission", {
    p_permission: "access_admin",
  });

  // Fallback: check is_admin() which ORs panel perms
  if (data !== true) {
    const { data: isAdmin } = await result.supabase.rpc("is_admin");
    if (isAdmin !== true) {
      return {
        ok: false as const,
        error: "غير مصرح — للمسؤولين فقط",
        profile: null,
        supabase: null,
      };
    }
  }
  return result;
}

export function hasPermission(
  permissions: Set<string> | PermissionKey[],
  permission: PermissionKey
) {
  if (permissions instanceof Set) return permissions.has(permission);
  return permissions.includes(permission);
}
