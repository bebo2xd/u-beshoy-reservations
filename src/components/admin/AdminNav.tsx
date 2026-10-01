"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Settings,
  CalendarRange,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { PermissionKey } from "@/lib/permissions";

const STORAGE_KEY = "admin-sidebar-collapsed";

const links: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: PermissionKey | PermissionKey[];
}[] = [
  {
    href: "/admin",
    label: "الطلبات",
    icon: LayoutDashboard,
    permission: "decide_bookings",
  },
  {
    href: "/admin/calendar",
    label: "التقويم",
    icon: CalendarDays,
    permission: "manage_calendar",
  },
  {
    href: "/admin/rooms",
    label: "الأماكن",
    icon: DoorOpen,
    permission: "manage_rooms",
  },
  {
    href: "/admin/schedules",
    label: "المواعيد الثابتة",
    icon: CalendarRange,
    permission: "manage_schedules",
  },
  {
    href: "/admin/blackouts",
    label: "الأوقات المقفولة",
    icon: Lock,
    permission: "manage_blackouts",
  },
  {
    href: "/admin/servants",
    label: "الخدام",
    icon: Users,
    permission: "manage_servants",
  },
  {
    href: "/admin/permissions",
    label: "الصلاحيات",
    icon: KeyRound,
    permission: "manage_permissions",
  },
  {
    href: "/admin/settings",
    label: "الإعدادات",
    icon: Settings,
    permission: "manage_settings",
  },
];

function canSee(
  permissions: string[],
  required?: PermissionKey | PermissionKey[]
) {
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.some((p) => permissions.includes(p));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

export function AdminNav({
  permissions = [],
  user,
}: {
  permissions?: string[];
  user?: {
    full_name: string;
    email?: string | null;
    role: string;
  } | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const visibleLinks = useMemo(
    () => links.filter((link) => canSee(permissions, link.permission)),
    [permissions]
  );

  const accountActive = pathname.startsWith("/admin/account");
  const roleLabel = user?.role === "admin" ? "أدمن" : "خادم";

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col gap-2 border-b border-border bg-card p-3 lg:h-dvh lg:border-b-0 lg:border-l lg:transition-[width] lg:duration-200",
        ready && collapsed ? "lg:w-[4.5rem]" : "lg:w-64"
      )}
    >
      <div
        className={cn(
          "mb-2 flex items-start gap-2 px-2 py-3",
          collapsed && "lg:flex-col lg:items-center lg:px-0"
        )}
      >
        <BrandLogo
          size={collapsed ? 36 : 44}
          className={cn("mt-0.5 shadow-sm", collapsed && "lg:mt-0")}
          priority
        />
        <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
          <p className="text-xs text-muted-foreground">لوحة التحكم</p>
          <h1 className="text-lg font-bold text-primary">حجوزات الكنيسة</h1>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden shrink-0 lg:inline-flex"
          onClick={toggle}
          aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
          title={collapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          {collapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav
        className={cn(
          "flex gap-1 overflow-x-auto lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto scrollbar-thin",
          collapsed && "lg:items-center"
        )}
      >
        {visibleLinks.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "lg:justify-center lg:px-2.5",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn(collapsed && "lg:hidden")}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto shrink-0 space-y-2 border-t border-border pt-3",
          collapsed && "lg:flex lg:flex-col lg:items-center"
        )}
      >
        {user && (
          <Link
            href="/admin/account"
            title={`${user.full_name} — تعديل الحساب`}
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-border bg-sand-2 p-2.5 transition-colors hover:bg-sand-3",
              accountActive && "ring-2 ring-ring",
              collapsed && "lg:justify-center lg:p-2"
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {initials(user.full_name)}
            </span>
            <span className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <span className="block truncate text-sm font-bold leading-tight">
                {user.full_name}
              </span>
              <span className="mt-0.5 block text-xs text-sand-11">
                {roleLabel}
                {user.email ? ` · ${user.email}` : ""}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <UserRound className="h-3.5 w-3.5" />
                تعديل البيانات
              </span>
            </span>
          </Link>
        )}

        <Link
          href="/book"
          title="صفحة الحجز"
          className={cn(
            "inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-sand-12 transition-colors hover:bg-secondary",
            collapsed && "lg:justify-center lg:px-2"
          )}
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span className={cn(collapsed && "lg:hidden")}>صفحة الحجز</span>
        </Link>

        <form action={logoutAction} className="w-full">
          <Button
            type="submit"
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 text-tomato-9 hover:bg-tomato-3 hover:text-tomato-9",
              collapsed && "lg:justify-center lg:px-2"
            )}
            title="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>تسجيل الخروج</span>
          </Button>
        </form>
      </div>
    </aside>
  );
}
