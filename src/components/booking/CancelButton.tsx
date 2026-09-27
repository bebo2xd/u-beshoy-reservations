"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/lib/actions/bookings";
import { toast } from "sonner";

export function CancelButton({ code }: { code: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="destructive"
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={() => {
        if (!confirm("هل تريد إلغاء طلب الحجز؟")) return;
        startTransition(async () => {
          const res = await cancelBooking(code);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("تم إلغاء الطلب");
          router.refresh();
        });
      }}
    >
      {pending ? "جاري الإلغاء..." : "إلغاء الطلب"}
    </Button>
  );
}
