"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function TrackLookupPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  return (
    <div className="flex min-h-dvh items-center bg-background px-5 py-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Link href="/book" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">
          <ArrowRight className="h-4 w-4" aria-hidden />
          العودة للحجز
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">متابعة طلب الحجز</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim()) router.push(`/r/${code.trim().toUpperCase()}`);
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">كود المتابعة</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="مثال: AB12CD34"
                  dir="ltr"
                  className="text-left uppercase tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full">
                عرض الطلب
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
