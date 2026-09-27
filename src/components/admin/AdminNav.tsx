"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  DoorOpen,
  LayoutDashboard,
  Lock,
  LogOut,
  Settings,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "الطلبات", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "التقويم", icon: CalendarDays },
  { href: "/admin/rooms", label: "الأماكن", icon: DoorOpen },
  { href: "/admin/schedules", label: "المواعيد الثابتة", icon: CalendarRange },
  { href: "/admin/blackouts", label: "الأوقات المقفولة", icon: Lock },
  { href: "/admin/settings", label: "الإعدادات", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col gap-2 border-b border-border bg-card p-3 lg:w-64 lg:border-b-0 lg:border-l lg:min-h-screen">
      <div className="mb-2 px-2 py-3">
        <p className="text-xs text-muted-foreground">لوحة التحكم</p>
        <h1 className="text-lg font-bold text-primary">حجز الغرف</h1>
      </div>
      <nav className="flex gap-1 overflow-x-auto lg:flex-col scrollbar-thin">
        {links.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-4">
        <form action={logoutAction}>
          <Button type="submit" variant="outline" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </form>
        <Link
          href="/book"
          className="mt-2 block text-center text-xs text-muted-foreground hover:text-primary"
        >
          فتح صفحة الحجز العامة
        </Link>
      </div>
    </aside>
  );
}
