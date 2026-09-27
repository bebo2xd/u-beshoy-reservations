import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateAr } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";
import { CancelButton } from "@/components/booking/CancelButton";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const statusMap = {
  pending: { label: "قيد المراجعة", variant: "pending" as const },
  approved: { label: "تمت الموافقة", variant: "success" as const },
  rejected: { label: "مرفوض", variant: "danger" as const },
  cancelled: { label: "ملغي", variant: "muted" as const },
};

export default async function TrackPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_booking_by_code", {
    p_code: code,
  });

  const result = data as {
    ok: boolean;
    booking?: {
      tracking_code: string;
      service_name: string;
      requester_name: string;
      booking_date: string;
      start_hour: number;
      end_hour: number;
      status: keyof typeof statusMap;
      admin_note: string | null;
      room_name: string;
      room_color: string;
      created_at: string;
    };
  };

  if (!result?.ok || !result.booking) notFound();
  const b = result.booking;
  const st = statusMap[b.status] ?? statusMap.pending;

  return (
    <div className="min-h-screen bg-sand-1 px-4 py-10">
      <div className="mx-auto max-w-md space-y-4">
        <Link href="/book" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowRight className="h-4 w-4" />
          العودة للحجز
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>طلب الحجز</CardTitle>
              <p className="mt-1 font-mono text-sm tracking-widest text-muted-foreground" dir="ltr">
                {b.tracking_code}
              </p>
            </div>
            <Badge variant={st.variant}>{st.label}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="المكان">
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: b.room_color }}
                />
                {b.room_name}
              </span>
            </Row>
            <Row label="التاريخ">{formatDateAr(b.booking_date)}</Row>
            <Row label="الوقت">{rangeLabel(b.start_hour, b.end_hour)}</Row>
            <Row label="الخدمة">{b.service_name}</Row>
            <Row label="مقدم الطلب">{b.requester_name}</Row>
            {b.admin_note && <Row label="ملاحظة الإدارة">{b.admin_note}</Row>}

            {(b.status === "pending" || b.status === "approved") && (
              <div className="pt-2">
                <CancelButton code={b.tracking_code} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-left">{children}</span>
    </div>
  );
}
