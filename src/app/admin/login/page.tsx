"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Church } from "lucide-react";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-2 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Church className="h-6 w-6" />
          </div>
          <CardTitle>دخول الإدارة</CardTitle>
          <CardDescription>سجّل الدخول لإدارة طلبات الحجز</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            action={(fd) => {
              setError(null);
              startTransition(async () => {
                const res = await loginAction(fd);
                if (res && !res.ok) setError(res.error);
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" name="email" type="email" required dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                dir="ltr"
                className="text-left"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "جاري الدخول..." : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
