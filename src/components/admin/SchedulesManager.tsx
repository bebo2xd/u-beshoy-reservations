"use client";

import { useState, useTransition } from "react";
import type { Room } from "@/lib/types";
import { DAY_NAMES_AR, WEEK_ORDER, hourLabel } from "@/lib/constants";
import { upsertSchedule, deleteSchedule } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type ScheduleRow = {
  id: string;
  room_id: string;
  day_of_week: number;
  start_hour: number;
  end_hour: number;
  title: string;
  notes: string | null;
  needs_review: boolean;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  rooms?: { name: string; color: string } | null;
};

const emptyForm = {
  room_id: "",
  day_of_week: 5,
  start_hour: 11,
  end_hour: 12,
  title: "",
  notes: "",
  needs_review: false,
  valid_from: "",
  valid_until: "",
  is_active: true,
};

export function SchedulesManager({
  schedules,
  rooms,
}: {
  schedules: ScheduleRow[];
  rooms: Room[];
}) {
  const [form, setForm] = useState<typeof emptyForm & { id?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    if (!form || !form.room_id || !form.title) {
      toast.error("أكمل البيانات المطلوبة");
      return;
    }
    startTransition(async () => {
      const res = await upsertSchedule({
        id: form.id,
        room_id: form.room_id,
        day_of_week: form.day_of_week,
        start_hour: form.start_hour,
        end_hour: form.end_hour,
        title: form.title,
        notes: form.notes,
        needs_review: form.needs_review,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("تم الحفظ");
      setForm(null);
      router.refresh();
    });
  }

  const reviewCount = schedules.filter((s) => s.needs_review && s.is_active).length;

  return (
    <div className="space-y-4">
      {reviewCount > 0 && (
        <div className="rounded-xl border border-amber-9 bg-amber-3 px-4 py-3 text-sm text-amber-11">
          يوجد {reviewCount} موعد يحتاج مراجعة (أوقات ناقصة أو غير واضحة في الجدول الأصلي)
        </div>
      )}

      <Button
        onClick={() =>
          setForm({ ...emptyForm, room_id: rooms[0]?.id ?? "" })
        }
      >
        إضافة موعد ثابت
      </Button>

      {form && (
        <Card>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>المكان</Label>
              <Select
                value={form.room_id}
                onValueChange={(v) => setForm({ ...form, room_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مكان" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اليوم</Label>
              <Select
                value={String(form.day_of_week)}
                onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_ORDER.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {DAY_NAMES_AR[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>من الساعة</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={form.start_hour}
                onChange={(e) => setForm({ ...form, start_hour: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>إلى الساعة</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={form.end_hour}
                onChange={(e) => setForm({ ...form, end_hour: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>عنوان الخدمة</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>صالح من</Label>
              <Input
                type="date"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>صالح حتى</Label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.needs_review}
                onCheckedChange={(v) => setForm({ ...form, needs_review: v })}
              />
              يحتاج مراجعة
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              نشط
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={save} disabled={pending}>
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setForm(null)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2">
        {schedules.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{s.title}</p>
                  {s.needs_review && <Badge variant="pending">يحتاج مراجعة</Badge>}
                  {!s.is_active && <Badge variant="muted">موقوف</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {s.rooms?.name} · {DAY_NAMES_AR[s.day_of_week]} ·{" "}
                  {hourLabel(s.start_hour)} – {hourLabel(s.end_hour)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      id: s.id,
                      room_id: s.room_id,
                      day_of_week: s.day_of_week,
                      start_hour: s.start_hour,
                      end_hour: s.end_hour,
                      title: s.title,
                      notes: s.notes ?? "",
                      needs_review: s.needs_review,
                      valid_from: s.valid_from ?? "",
                      valid_until: s.valid_until ?? "",
                      is_active: s.is_active,
                    })
                  }
                >
                  تعديل
                </Button>
                {s.is_active && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      startTransition(async () => {
                        await deleteSchedule(s.id);
                        toast.success("تم إيقاف الموعد");
                        router.refresh();
                      });
                    }}
                  >
                    إيقاف
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
