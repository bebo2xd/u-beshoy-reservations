"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";
import { updateOwnProfile } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AccountForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    full_name: profile.full_name,
    email: profile.email || "",
    phone: profile.phone || "",
    password: "",
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>بيانات الحساب</CardTitle>
        <Badge variant={profile.role === "admin" ? "pending" : "muted"}>
          {profile.role === "admin" ? "أدمن" : "خادم"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>الاسم</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="الاسم بالكامل"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>البريد الإلكتروني</Label>
            <Input
              type="email"
              dir="ltr"
              className="text-left"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>رقم الواتساب</Label>
            <Input
              dir="ltr"
              className="text-left"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="01xxxxxxxxx"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>كلمة مرور جديدة (اختياري)</Label>
            <PasswordInput
              dir="ltr"
              className="text-left"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              placeholder="اتركها فارغة للإبقاء على الحالية"
            />
          </div>
        </div>
        <Button
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await updateOwnProfile({
                full_name: form.full_name,
                email: form.email,
                phone: form.phone,
                password: form.password || undefined,
              });
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success("تم حفظ بياناتك");
              setForm((f) => ({ ...f, password: "" }));
              router.refresh();
            });
          }}
        >
          حفظ التعديلات
        </Button>
      </CardContent>
    </Card>
  );
}
