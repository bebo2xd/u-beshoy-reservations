"use client";

import { useState, useTransition } from "react";
import type { AppSettings } from "@/lib/types";
import { updateSettings } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [form, setForm] = useState(settings);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>عنوان الموقع</Label>
          <Input
            value={form.site_title}
            onChange={(e) => setForm({ ...form, site_title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>ساعة البداية</Label>
          <Input
            type="number"
            value={form.open_hour}
            onChange={(e) => setForm({ ...form, open_hour: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>ساعة النهاية</Label>
          <Input
            type="number"
            value={form.close_hour}
            onChange={(e) => setForm({ ...form, close_hour: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>أقصى عدد أسابيع للحجز مقدماً</Label>
          <Input
            type="number"
            value={form.max_weeks_ahead}
            onChange={(e) =>
              setForm({ ...form, max_weeks_ahead: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>الملاحظات الهامة</Label>
          <Textarea
            className="min-h-[180px]"
            value={form.important_notes}
            onChange={(e) => setForm({ ...form, important_notes: e.target.value })}
          />
        </div>
        <Button
          className="sm:col-span-2"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const res = await updateSettings({
                open_hour: form.open_hour,
                close_hour: form.close_hour,
                max_weeks_ahead: form.max_weeks_ahead,
                important_notes: form.important_notes,
                site_title: form.site_title,
              });
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success("تم حفظ الإعدادات");
            });
          }}
        >
          حفظ الإعدادات
        </Button>
      </CardContent>
    </Card>
  );
}
