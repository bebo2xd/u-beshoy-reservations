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
  requesterName: string;
  requesterPhone: string;
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
  requesterName,
  requesterPhone,
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
      <SheetContent
        side="bottom"
        className="overflow-y-auto sm:mx-auto sm:max-w-lg sm:rounded-t-3xl"
      >
        <SheetHeader>
          <SheetTitle className="text-2xl">طلب حجز مكان</SheetTitle>
          <SheetDescription className="text-base font-medium text-sand-11">
            {roomName}
            <br />
            {formatDateAr(date)} · {rangeLabel(startHour, endHour)}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-5">
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <div className="rounded-2xl border border-border bg-sand-2 p-4 text-sm">
            <p className="font-bold text-sand-12">بيانات الخادم</p>
            <p className="mt-1 font-semibold">{requesterName}</p>
            <p className="mt-0.5 text-sand-11" dir="ltr">
              {requesterPhone}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="serviceName">اسم الخدمة / الاجتماع</Label>
            <Input
              id="serviceName"
              name="serviceName"
              required
              placeholder="مثال: اجتماع الشباب"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">ملاحظات (اختياري)</Label>
            <Textarea id="notes" name="notes" placeholder="أي تفاصيل إضافية" />
          </div>

          <div className="rounded-2xl border border-border bg-sand-2 p-4">
            <p className="mb-2 text-base font-bold text-tomato-9">ملاحظات هامة</p>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-sand-11">
              {importantNotes}
            </pre>
            <label className="mt-4 flex items-start gap-3 text-base font-medium">
              <Checkbox
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5 h-6 w-6"
              />
              <span>قرأت الملاحظات وأوافق عليها</span>
            </label>
          </div>

          <p className="text-sm font-medium text-sand-11">
            الطلب يحتاج موافقة الإدارة قبل تأكيد الحجز.
          </p>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={pending || !agreed}
          >
            {pending ? "جاري الإرسال..." : "إرسال طلب الحجز"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
