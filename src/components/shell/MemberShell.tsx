"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, LogOut, Shield } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { logoutAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/book", label: "الحجز", icon: CalendarDays },
  { href: "/my-bookings", label: "طلباتي", icon: ClipboardList },
];

export function MemberShell({
  title,
  subtitle,
  showAdmin = false,
  children,
}: {
  title: string;
  subtitle: string;
  showAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <BrandLogo size={40} className="shadow-sm" priority />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold leading-tight">
              {title}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {showAdmin && (
            <Link
              href="/admin"
              aria-label="لوحة التحكم"
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-foreground transition-colors hover:bg-secondary"
            >
              <Shield className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}

          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="خروج"
              className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl text-foreground transition-colors hover:bg-secondary"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-10">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="التنقل الرئيسي"
      >
        <div className="mx-auto grid max-w-lg grid-cols-2">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
