"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decideBooking } from "@/lib/actions/bookings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function BookingActions({ bookingId }: { bookingId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function decide(status: "approved" | "rejected") {
    startTransition(async () => {
      const res = await decideBooking(bookingId, status, note || undefined);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض");
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
      </div>
    </div>
  );
}
