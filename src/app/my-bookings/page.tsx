import Link from "next/link";
import { redirect } from "next/navigation";
import { MemberShell } from "@/components/shell/MemberShell";
import { getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateAr } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { CancelButton } from "@/components/booking/CancelButton";
import { Button } from "@/components/ui/button";

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
  const [{ data: bookings }, { data: permissionsHasAdmin }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, rooms(name, color)")
      .eq("created_by", profile.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("is_admin"),
  ]);

  return (
    <MemberShell
      title="طلباتي"
      subtitle={profile.full_name}
      showAdmin={Boolean(permissionsHasAdmin)}
    >
      <div className="mx-auto max-w-2xl space-y-3">
        {!bookings?.length ? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <p className="text-lg font-bold">لا توجد طلبات بعد</p>
            <Button asChild className="mt-4">
              <Link href="/book">احجز مكاناً الآن</Link>
            </Button>
          </div>
        ) : (
          bookings.map((b) => {
            const room = b.rooms as { name?: string; color?: string } | null;
            const canCancel =
              b.status === "pending" || b.status === "approved";
            return (
              <article
                key={b.id}
                className="rounded-3xl border border-border/80 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold">
                      {b.service_name}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: room?.color ?? "#0369a1" }}
                        aria-hidden
                      />
                      <span className="min-w-0 truncate">
                        {room?.name ?? "مكان"}
                      </span>
                    </p>
                  </div>
                  <Badge variant={statusVariant[b.status] ?? "muted"}>
                    {statusLabel[b.status] ?? b.status}
                  </Badge>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">التاريخ</dt>
                    <dd className="font-semibold">{formatDateAr(b.booking_date)}</dd>
                  </div>
                  <div className="rounded-2xl bg-muted px-3 py-2">
                    <dt className="text-xs text-muted-foreground">الوقت</dt>
                    <dd className="font-semibold" dir="ltr">
                      {rangeLabel(b.start_hour, b.end_hour)}
                    </dd>
                  </div>
                </dl>

                <p
                  className="mt-3 font-mono text-xs tracking-widest text-muted-foreground"
                  dir="ltr"
                >
                  {b.tracking_code}
                </p>

                {b.admin_note && (
                  <p className="mt-3 rounded-2xl bg-secondary px-3 py-2 text-sm">
                    <span className="font-semibold">ملاحظة الإدارة: </span>
                    {b.admin_note}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/r/${b.tracking_code}`}>التفاصيل</Link>
                  </Button>
                  {canCancel && (
                    <CancelButton code={b.tracking_code} className="w-auto" size="sm" />
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </MemberShell>
  );
}
