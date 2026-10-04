import { Suspense } from "react";
import { Hash, Phone, StickyNote, UserRound } from "lucide-react";
import { getPendingBookings, getRecentBookings } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingActions } from "@/components/admin/BookingActions";
import { BookingDeepLinkTarget } from "@/components/admin/BookingDeepLink";
import { ScreenHeader } from "@/components/ui/screen-header";
import { CardListSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { formatDateAr } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const { booking: focusBookingId } = await searchParams;

  return (
    <div className="space-y-6">
      <ScreenHeader
        title="الطلبات"
        description="المراجعة والطلبات الأخيرة"
      />

      <Suspense fallback={<CardListSkeleton count={3} />}>
        <PendingSection focusBookingId={focusBookingId} />
      </Suspense>

      <Suspense fallback={<TableSkeleton rows={6} />}>
        <RecentSection />
      </Suspense>
    </div>
  );
}

async function PendingSection({ focusBookingId }: { focusBookingId?: string }) {
  const pending = await getPendingBookings();

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        قيد المراجعة
        <span className="ms-2 text-sm font-normal text-muted-foreground">
          ({pending.length})
        </span>
      </h2>
      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            لا توجد طلبات معلقة حالياً
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {pending.map((b) => {
            const focused = focusBookingId === b.id;
            return (
              <BookingDeepLinkTarget
                key={b.id}
                bookingId={b.id}
                focused={focused}
              >
                <Card
                  className={focused ? "border-amber-500 shadow-md" : undefined}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                    <div>
                      <CardTitle className="text-base">{b.service_name}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {b.rooms?.name} · {formatDateAr(b.booking_date)} ·{" "}
                        {rangeLabel(b.start_hour, b.end_hour)}
                      </p>
                    </div>
                    <Badge variant="pending">معلق</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid gap-2 text-muted-foreground sm:grid-cols-3">
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                        {b.requester_name}
                      </span>
                      <span className="inline-flex items-center gap-2" dir="ltr">
                        <Phone className="h-4 w-4 shrink-0" aria-hidden />
                        {b.requester_phone}
                      </span>
                      <span
                        className="inline-flex items-center gap-2 font-mono"
                        dir="ltr"
                      >
                        <Hash className="h-4 w-4 shrink-0" aria-hidden />
                        {b.tracking_code}
                      </span>
                    </div>
                    {b.notes && (
                      <p className="flex items-start gap-2 rounded-2xl bg-muted px-3 py-2 text-foreground">
                        <StickyNote
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        {b.notes}
                      </p>
                    )}
                    <BookingActions bookingId={b.id} />
                  </CardContent>
                </Card>
              </BookingDeepLinkTarget>
            );
          })}
        </div>
      )}
    </section>
  );
}

async function RecentSection() {
  const recent = await getRecentBookings(20);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">آخر الطلبات</h2>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {recent.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{b.service_name}</p>
                <p className="text-muted-foreground">
                  {b.rooms?.name} · {formatDateAr(b.booking_date)} ·{" "}
                  {rangeLabel(b.start_hour, b.end_hour)}
                </p>
              </div>
              <StatusBadge status={b.status} />
            </div>
          ))}
          {recent.length === 0 && (
            <p className="px-5 py-8 text-center text-muted-foreground">
              لا توجد طلبات
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge variant="pending">معلق</Badge>;
  if (status === "approved") return <Badge variant="success">مقبول</Badge>;
  if (status === "rejected") return <Badge variant="danger">مرفوض</Badge>;
  return <Badge variant="muted">ملغي</Badge>;
}
