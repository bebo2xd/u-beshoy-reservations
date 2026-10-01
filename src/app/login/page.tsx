"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const inactive = searchParams.get("error") === "inactive";
  const [error, setError] = useState<string | null>(
    inactive ? "الحساب غير مفعّل. تواصل مع الإدارة" : null
  );
  const [pending, startTransition] = useTransition();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <BrandLogo size={72} className="mx-auto shadow-sm" priority />
        </div>
        <CardTitle>حجوزات الكنيسة</CardTitle>
        <CardDescription>
          ادخل بالإيميل أو رقم التليفون — للخدام المسجّلين فقط
        </CardDescription>
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
          <input type="hidden" name="next" value={next} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="identifier">الإيميل أو رقم التليفون</Label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              required
              dir="ltr"
              className="text-left"
              autoComplete="username"
              placeholder="01xxxxxxxxx أو email@example.com"
              inputMode="email"
            />
          </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <PasswordInput
                id="password"
                name="password"
                required
                dir="ltr"
                className="text-left"
                autoComplete="current-password"
              />
            </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "جاري الدخول..." : "دخول"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sand-2 px-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md p-8 text-center text-muted-foreground">
            جاري التحميل...
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
