"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getOneSignal,
  isNativeApp,
  resolvePushDeepLink,
  toE164Phone,
} from "@/lib/native/onesignal";

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

type ProfileRow = {
  id: string;
  role: string;
  is_active: boolean;
  phone: string | null;
  email?: string | null;
};

export function OneSignalBootstrap() {
  const router = useRouter();
  const linkedUserId = useRef<string | null>(null);
  const pendingProfile = useRef<ProfileRow | null>(null);
  const lastSms = useRef<string | null>(null);

  useEffect(() => {
    if (!isNativeApp() || !APP_ID) return;

    let cancelled = false;
    let authUnsubscribe: (() => void) | undefined;
    let onClick:
      | ((event: {
          notification: {
            additionalData?: Record<string, unknown> | null;
            launchURL?: string | null;
          };
        }) => void)
      | undefined;
    let onSubChange:
      | ((event: {
          current: { id?: string; optedIn: boolean };
        }) => void)
      | undefined;

    void (async () => {
      const OneSignal = await getOneSignal();
      if (!OneSignal || cancelled) return;

      OneSignal.initialize(APP_ID);

      onClick = (event) => {
        const path = resolvePushDeepLink(
          event.notification.additionalData,
          event.notification.launchURL
        );
        if (!path) return;
        router.push(path);
      };
      OneSignal.Notifications.addEventListener("click", onClick);

      const applyProfile = async (profile: ProfileRow | null) => {
        pendingProfile.current = profile;

        if (!profile) {
          try {
            OneSignal.User.removeTags(["role", "phone"]);
            if (lastSms.current) {
              OneSignal.User.removeSms(lastSms.current);
              lastSms.current = null;
            }
          } catch {
            /* ignore */
          }
          OneSignal.logout();
          OneSignal.User.pushSubscription.optOut();
          linkedUserId.current = null;
          return;
        }

        OneSignal.User.pushSubscription.optIn();
        await OneSignal.Notifications.requestPermission(true);

        // Ensure login runs after permission / subscription is ready.
        OneSignal.login(profile.id);
        linkedUserId.current = profile.id;

        OneSignal.User.addTags({
          role: profile.role,
          phone: profile.phone ?? "",
        });

        const e164 = toE164Phone(profile.phone);
        if (e164) {
          if (lastSms.current && lastSms.current !== e164) {
            try {
              OneSignal.User.removeSms(lastSms.current);
            } catch {
              /* ignore */
            }
          }
          OneSignal.User.addSms(e164);
          lastSms.current = e164;
        }

        if (profile.email) {
          OneSignal.User.addEmail(profile.email);
        }

        // Re-bind if subscription arrives slightly later.
        const subId = await OneSignal.User.pushSubscription.getIdAsync();
        if (subId && linkedUserId.current === profile.id) {
          OneSignal.login(profile.id);
        }
      };

      onSubChange = (event) => {
        if (!event.current?.id || !pendingProfile.current) return;
        if (linkedUserId.current !== pendingProfile.current.id) {
          OneSignal.login(pendingProfile.current.id);
          linkedUserId.current = pendingProfile.current.id;
        }
      };
      OneSignal.User.pushSubscription.addEventListener("change", onSubChange);

      const supabase = createClient();

      const syncUser = async (userId: string | null) => {
        if (!userId) {
          await applyProfile(null);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, is_active, phone, email")
          .eq("id", userId)
          .maybeSingle();

        if (!profile?.is_active) {
          await applyProfile(null);
          return;
        }

        // Switching accounts: clear previous identity first so role/phone refresh cleanly.
        if (linkedUserId.current && linkedUserId.current !== profile.id) {
          try {
            OneSignal.User.removeTags(["role", "phone"]);
            if (lastSms.current) {
              OneSignal.User.removeSms(lastSms.current);
              lastSms.current = null;
            }
          } catch {
            /* ignore */
          }
          OneSignal.logout();
          linkedUserId.current = null;
        }

        await applyProfile(profile as ProfileRow);
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await syncUser(session?.user?.id ?? null);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        void syncUser(nextSession?.user?.id ?? null);
      });
      authUnsubscribe = () => subscription.unsubscribe();
    })();

    return () => {
      cancelled = true;
      authUnsubscribe?.();
      void getOneSignal().then((OneSignal) => {
        if (!OneSignal) return;
        if (onClick) {
          OneSignal.Notifications.removeEventListener("click", onClick);
        }
        if (onSubChange) {
          OneSignal.User.pushSubscription.removeEventListener(
            "change",
            onSubChange
          );
        }
      });
    };
  }, [router]);

  return null;
}
