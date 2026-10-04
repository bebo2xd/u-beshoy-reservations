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
  Menu,
  Settings,
  CalendarRange,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
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

function linkActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function NavLinks({
  items,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  items: typeof links;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((link) => {
        const active = linkActive(pathname, link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
              collapsed && "lg:justify-center lg:px-0",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-secondary"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className={cn(collapsed && "lg:sr-only")}>{link.label}</span>
          </Link>
        );
      })}
    </>
  );
}

function AccountFooter({
  user,
  roleLabel,
  accountActive,
  collapsed = false,
  onNavigate,
}: {
  user?: {
    full_name: string;
    email?: string | null;
    role: string;
  } | null;
  roleLabel: string;
  accountActive: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-1 border-t border-border pt-3",
        collapsed && "lg:items-center"
      )}
    >
      {user && (
        <Link
          href="/admin/account"
          title={
            user.email
              ? `${user.full_name} — ${roleLabel} · ${user.email}`
              : `${user.full_name} — ${roleLabel}`
          }
          aria-current={accountActive ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 transition-colors hover:bg-secondary",
            accountActive && "bg-secondary",
            collapsed && "lg:w-12 lg:justify-center lg:px-0"
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials(user.full_name)}
          </span>
          <span className={cn("min-w-0 text-right", collapsed && "lg:hidden")}>
            <span className="block truncate text-sm font-semibold leading-tight">
              {user.full_name}
            </span>
            <span className="block truncate text-xs leading-tight text-muted-foreground">
              {roleLabel}
            </span>
          </span>
        </Link>
      )}

      <Link
        href="/book"
        title="صفحة الحجز"
        onClick={onNavigate}
        className={cn(
          "inline-flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          collapsed && "lg:w-12 lg:justify-center lg:px-0"
        )}
      >
        <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
        <span className={cn(collapsed && "lg:sr-only")}>صفحة الحجز</span>
      </Link>

      <form action={logoutAction} className={cn(collapsed && "lg:w-12")}>
        <Button
          type="submit"
          variant="ghost"
          title="تسجيل الخروج"
          className={cn(
            "h-12 w-full justify-start gap-3 px-3 text-sm text-muted-foreground hover:bg-tomato-3 hover:text-tomato-9",
            collapsed && "lg:w-12 lg:justify-center lg:px-0"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />
          <span className={cn(collapsed && "lg:sr-only")}>خروج</span>
        </Button>
      </form>
    </div>
  );
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="فتح القائمة"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <Link
          href="/admin"
          aria-label="الصفحة الرئيسية للوحة التحكم"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-0.5"
        >
          <BrandLogo size={36} className="shadow-sm" priority />
          <span className="min-w-0 flex-1">
            <span className="block text-xs leading-none text-muted-foreground">
              لوحة التحكم
            </span>
            <span className="block truncate text-base font-bold leading-tight text-primary">
              حجوزات الكنيسة
            </span>
          </span>
        </Link>
      </header>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-[min(88vw,19rem)] max-w-none gap-0 border-l-0 p-0 shadow-2xl"
        >
          <SheetDescription className="sr-only">
            أقسام لوحة التحكم
          </SheetDescription>
          <div className="flex items-center gap-3 border-b border-border px-4 pb-4 pe-16 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link
            href="/admin"
            onClick={closeDrawer}
            aria-label="الصفحة الرئيسية للوحة التحكم"
            className="flex min-w-0 items-center gap-3"
          >
            <BrandLogo size={44} className="shadow-sm" />
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">لوحة التحكم</span>
              <SheetTitle className="truncate text-lg font-bold text-primary">
                حجوزات الكنيسة
              </SheetTitle>
            </span>
          </Link>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
            <NavLinks
              items={visibleLinks}
              pathname={pathname}
              onNavigate={closeDrawer}
            />
          </nav>
          <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <AccountFooter
              user={user}
              roleLabel={roleLabel}
              accountActive={accountActive}
              onNavigate={closeDrawer}
            />
          </div>
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          "hidden h-dvh shrink-0 flex-col gap-2 border-l border-border bg-card p-3 lg:flex lg:transition-[width] lg:duration-200",
          ready && collapsed ? "lg:w-[4.5rem]" : "lg:w-64"
        )}
      >
        <div
          className={cn(
            "mb-1 flex items-start gap-2 px-2 py-2",
            collapsed && "lg:flex-col lg:items-center lg:px-0"
          )}
        >
          <Link
            href="/admin"
            aria-label="الصفحة الرئيسية للوحة التحكم"
            className={cn(
              "flex min-w-0 flex-1 items-start gap-2 rounded-xl",
              collapsed && "lg:flex-none lg:flex-col lg:items-center lg:px-0"
            )}
          >
            <BrandLogo
              size={collapsed ? 36 : 44}
              className={cn("shadow-sm", collapsed && "lg:mt-0")}
              priority
            />
            <span className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
              <span className="block text-xs text-muted-foreground">لوحة التحكم</span>
              <span className="block text-lg font-bold text-primary">حجوزات الكنيسة</span>
            </span>
          </Link>
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
            "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto",
            collapsed && "lg:items-center"
          )}
        >
          <NavLinks
            items={visibleLinks}
            pathname={pathname}
            collapsed={collapsed}
          />
        </nav>

        <AccountFooter
          user={user}
          roleLabel={roleLabel}
          accountActive={accountActive}
          collapsed={collapsed}
        />
      </aside>
    </>
  );
}
