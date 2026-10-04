"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand/BrandLogo";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const inactive = searchParams.get("error") === "inactive";
  const [error, setError] = useState<string | null>(
    inactive ? "الحساب غير مفعّل. تواصل مع الإدارة" : null
  );
  const [pending, startTransition] = useTransition();

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <BrandLogo size={76} className="mx-auto shadow-sm" priority />
        <h1 className="mt-4 text-3xl font-bold text-primary">حجوزات الكنيسة</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          ادخل بالإيميل أو رقم التليفون. الحجز للخدام المسجّلين فقط.
        </p>
      </div>

      <form
        className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
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
        {error && (
          <p className="rounded-xl bg-tomato-3 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "جاري الدخول..." : "دخول"}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
