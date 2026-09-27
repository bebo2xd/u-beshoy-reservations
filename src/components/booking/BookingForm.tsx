"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { submitBookingRequest } from "@/lib/actions/bookings";
import { formatDateAr } from "@/lib/dates";
import { rangeLabel } from "@/lib/constants";
import { toast } from "sonner";

interface BookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName: string;
  date: string;
  startHour: number;
  endHour: number;
  importantNotes: string;
  onSuccess?: () => void;
}

export function BookingForm({
  open,
  onOpenChange,
  roomId,
  roomName,
  date,
  startHour,
  endHour,
  importantNotes,
  onSuccess,
}: BookingFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [agreed, setAgreed] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed) {
      toast.error("يجب الموافقة على الملاحظات الهامة أولاً");
      return;
    }
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitBookingRequest({
        roomId,
        date,
        startHour,
        endHour,
        serviceName: String(fd.get("serviceName") ?? ""),
        requesterName: String(fd.get("requesterName") ?? ""),
        requesterPhone: String(fd.get("requesterPhone") ?? ""),
        notes: String(fd.get("notes") ?? ""),
        honeypot,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("تم إرسال طلب الحجز بنجاح");
      onOpenChange(false);
      onSuccess?.();
      router.push(`/r/${result.tracking_code}`);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto sm:mx-auto sm:max-w-lg sm:rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>طلب حجز مكان</SheetTitle>
          <SheetDescription>
            {roomName} — {formatDateAr(date)} — {rangeLabel(startHour, endHour)}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* honeypot */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <div className="space-y-2">
            <Label htmlFor="serviceName">اسم الخدمة / الاجتماع</Label>
            <Input id="serviceName" name="serviceName" required placeholder="مثال: اجتماع الشباب" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requesterName">اسم مقدم الطلب</Label>
            <Input id="requesterName" name="requesterName" required placeholder="الاسم بالكامل" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requesterPhone">رقم الواتساب</Label>
            <Input
              id="requesterPhone"
              name="requesterPhone"
              required
              inputMode="tel"
              dir="ltr"
              className="text-left"
              placeholder="01xxxxxxxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea id="notes" name="notes" placeholder="أي تفاصيل إضافية" />
          </div>

          <div className="rounded-xl border border-border bg-sand-2 p-3">
            <p className="mb-2 text-sm font-semibold text-tomato-9">ملاحظات هامة</p>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-muted-foreground">
              {importantNotes}
            </pre>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <span>قرأت الملاحظات وأوافق عليها</span>
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            الطلب يحتاج موافقة الإدارة قبل تأكيد الحجز.
          </p>

          <Button type="submit" className="w-full" size="lg" disabled={pending || !agreed}>
            {pending ? "جاري الإرسال..." : "إرسال طلب الحجز"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
