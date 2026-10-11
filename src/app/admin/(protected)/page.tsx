import { Suspense } from "react";
import { Hash, Phone, StickyNote, UserRound } from "lucide-react";
import {
  getActiveRooms,
  getPendingBookings,
  listBookingsPage,
  normalizeBookingPageSize,
} from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingActions } from "@/components/admin/BookingActions";
import { BookingDeepLinkTarget } from "@/components/admin/BookingDeepLink";
import { RecentBookingsPanel } from "@/components/admin/RecentBookingsPanel";
import { ScreenHeader } from "@/components/ui/screen-header";
import { CardListSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { formatDateAr } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";
import type { BookingListStatus, BookingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES = new Set<BookingStatus>([
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

function parseStatus(value?: string): BookingListStatus {
  if (value && STATUSES.has(value as BookingStatus)) {
    return value as BookingStatus;
  }
  return "all";
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    booking?: string;
    q?: string;
    status?: string;
    room?: string;
    page?: string;
    per?: string;
  }>;
}) {
  const params = await searchParams;
  const focusBookingId = params.booking;

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
        <RecentSection
          q={params.q ?? ""}
          status={parseStatus(params.status)}
          roomId={params.room ?? ""}
          page={Math.max(1, Number(params.page) || 1)}
          pageSize={normalizeBookingPageSize(params.per)}
        />
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
                      <a
                        href={`tel:${b.requester_phone.replace(/\D/g, "")}`}
                        className="inline-flex items-center gap-2 rounded-md transition-colors hover:text-primary hover:underline"
                        dir="ltr"
                        aria-label={`اتصال بـ ${b.requester_phone}`}
                      >
                        <Phone className="h-4 w-4 shrink-0" aria-hidden />
                        {b.requester_phone}
                      </a>
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

async function RecentSection({
  q,
  status,
  roomId,
  page,
  pageSize,
}: {
  q: string;
  status: BookingListStatus;
  roomId: string;
  page: number;
  pageSize: number;
}) {
  const [result, rooms] = await Promise.all([
    listBookingsPage({ q, status, roomId, page, pageSize }),
    getActiveRooms(),
  ]);

  return (
    <RecentBookingsPanel
      items={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      q={q}
      status={status}
      roomId={roomId}
      rooms={rooms.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
      }))}
    />
  );
}
