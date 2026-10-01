"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildDecisionWhatsAppText,
  buildWhatsAppClickToChatUrl,
} from "@/lib/whatsapp-link";
import { cn } from "@/lib/utils";

type DecisionStatus = "approved" | "rejected";

type Props = {
  phone: string;
  requesterName: string;
  serviceName: string;
  roomName: string;
  dateLabel: string;
  timeLabel: string;
  trackingCode: string;
  adminNote?: string | null;
  /** Prefill decision type from current booking status when possible */
  defaultStatus?: DecisionStatus;
};

export function BookingWhatsAppLink({
  phone,
  requesterName,
  serviceName,
  roomName,
  dateLabel,
  timeLabel,
  trackingCode,
  adminNote,
  defaultStatus = "approved",
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DecisionStatus>(defaultStatus);
  const [note, setNote] = useState(adminNote?.trim() ?? "");
  const [message, setMessage] = useState("");

  const built = useMemo(
    () =>
      buildDecisionWhatsAppText({
        status,
        service_name: serviceName,
        room_name: roomName,
        date_label: dateLabel,
        time_label: timeLabel,
        tracking_code: trackingCode,
        admin_note: note || null,
      }),
    [status, serviceName, roomName, dateLabel, timeLabel, trackingCode, note]
  );

  useEffect(() => {
    if (open) {
      setStatus(defaultStatus);
      setNote(adminNote?.trim() ?? "");
    }
  }, [open, defaultStatus, adminNote]);

  useEffect(() => {
    if (open) setMessage(built);
  }, [open, built]);

  const whatsappUrl = buildWhatsAppClickToChatUrl(phone, message);
  if (!phone) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-4 w-4" />
        واتساب
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>رسالة واتساب</DialogTitle>
            <DialogDescription>
              راجع التفاصيل وعدّل الرسالة قبل ما تفتح واتساب
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              <Row label="الاسم" value={requesterName} />
              <Row label="التليفون" value={phone} dir="ltr" />
              <Row label="الخدمة" value={serviceName} />
              <Row label="المكان" value={roomName} />
              <Row label="التاريخ" value={dateLabel} />
              <Row label="الوقت" value={timeLabel} />
              <Row label="الكود" value={trackingCode} dir="ltr" />
            </div>

            <div className="flex flex-col gap-2">
              <Label>نوع الرسالة</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={status === "approved" ? "success" : "outline"}
                  size="sm"
                  onClick={() => setStatus("approved")}
                >
                  موافقة
                </Button>
                <Button
                  type="button"
                  variant={status === "rejected" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setStatus("rejected")}
                >
                  رفض
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="wa-note">ملاحظة (اختياري)</Label>
              <Textarea
                id="wa-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="تظهر داخل الرسالة…"
                className="min-h-[64px]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="wa-message">الرسالة</Label>
              <Textarea
                id="wa-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[180px] font-medium leading-relaxed"
                dir="rtl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={!whatsappUrl || !message.trim()}
              className="gap-2"
              onClick={() => {
                if (!whatsappUrl) return;
                window.open(whatsappUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="h-4 w-4" />
              فتح واتساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn("font-medium text-foreground", dir === "ltr" && "font-mono")}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}
