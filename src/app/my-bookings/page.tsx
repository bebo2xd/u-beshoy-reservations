import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateAr } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { CancelButton } from "@/components/booking/CancelButton";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

const statusVariant: Record<
  string,
  "pending" | "success" | "danger" | "muted"
> = {
  pending: "pending",
  approved: "success",
  rejected: "danger",
  cancelled: "muted",
};

export default async function MyBookingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/my-bookings");

  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, rooms(name, color)")
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-sand-2">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <BrandLogo size={44} priority />
            <div>
              <h1 className="text-xl font-bold">طلباتي</h1>
              <p className="text-sm text-muted-foreground">{profile.full_name}</p>
            </div>
          </div>
          <Link
            href="/book"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            العودة للحجز
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 px-4 py-6">
        {!bookings?.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-bold">لا توجد طلبات بعد</p>
            <Link href="/book" className="mt-3 inline-block text-primary hover:underline">
              احجز مكاناً الآن
            </Link>
          </div>
        ) : (
          bookings.map((b) => {
            const room = b.rooms as { name?: string; color?: string } | null;
            const canCancel =
              b.status === "pending" || b.status === "approved";
            return (
              <div
                key={b.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{b.service_name}</p>
                    <p className="mt-1 text-sm text-sand-11">
                      {room?.name ?? "مكان"} · {formatDateAr(b.booking_date)} ·{" "}
                      <span dir="ltr">
                        {rangeLabel(b.start_hour, b.end_hour)}
                      </span>
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">
                      {b.tracking_code}
                    </p>
                  </div>
                  <Badge variant={statusVariant[b.status] ?? "muted"}>
                    {statusLabel[b.status] ?? b.status}
                  </Badge>
                </div>
                {b.admin_note && (
                  <p className="mt-2 text-sm text-sand-11">
                    ملاحظة الإدارة: {b.admin_note}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/r/${b.tracking_code}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    التفاصيل
                  </Link>
                  {canCancel && (
                    <div className="w-auto">
                      <CancelButton code={b.tracking_code} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
