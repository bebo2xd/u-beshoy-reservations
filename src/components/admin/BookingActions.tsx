"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { decideBooking } from "@/lib/actions/bookings";
import {
  buildDecisionWhatsAppText,
  buildWhatsAppClickToChatUrl,
} from "@/lib/whatsapp-link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type BookingActionsProps = {
  bookingId: string;
  requesterPhone: string;
  serviceName: string;
  roomName: string;
  dateLabel: string;
  timeLabel: string;
  trackingCode: string;
};

export function BookingActions({
  bookingId,
  requesterPhone,
  serviceName,
  roomName,
  dateLabel,
  timeLabel,
  trackingCode,
}: BookingActionsProps) {
  const [note, setNote] = useState("");
  const [openWhatsApp, setOpenWhatsApp] = useState(true);
  const [pending, startTransition] = useTransition();
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string | null>(null);
  const router = useRouter();

  function previewUrl(status: "approved" | "rejected") {
    const text = buildDecisionWhatsAppText({
      status,
      service_name: serviceName,
      room_name: roomName,
      date_label: dateLabel,
      time_label: timeLabel,
      tracking_code: trackingCode,
      admin_note: note || null,
    });
    return buildWhatsAppClickToChatUrl(requesterPhone, text);
  }

  function decide(status: "approved" | "rejected") {
    startTransition(async () => {
      const res = await decideBooking(bookingId, status, note || undefined);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      const url = res.whatsappUrl ?? previewUrl(status);
      setLastWhatsAppUrl(url);

      toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض");

      if (openWhatsApp && url) {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.message("اتفتح واتساب بالرسالة — ابعت يدوي");
      }

      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="ملاحظة لمقدم الطلب (اختياري — تظهر في رسالة الواتساب)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="min-h-[60px]"
      />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2">
        <div className="space-y-0.5">
          <Label htmlFor={`wa-${bookingId}`} className="text-sm font-medium">
            افتح واتساب بعد القرار
          </Label>
          <p className="text-xs text-muted-foreground">
            يفتح محادثة الشخص بالرسالة جاهزة للإرسال اليدوي
          </p>
        </div>
        <Switch
          id={`wa-${bookingId}`}
          checked={openWhatsApp}
          onCheckedChange={setOpenWhatsApp}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="success"
          size="sm"
          disabled={pending}
          onClick={() => decide("approved")}
        >
          موافقة
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => decide("rejected")}
        >
          رفض
        </Button>
        {lastWhatsAppUrl && (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href={lastWhatsAppUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="me-1.5 h-4 w-4" />
              إعادة فتح واتساب
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
