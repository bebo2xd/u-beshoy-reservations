"use client";

import { useState, useTransition } from "react";
import type { Room } from "@/lib/types";
import {
  createBlackout,
  createMonthlyServantsMeeting,
  deleteBlackout,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { HourSelect } from "@/components/ui/hour-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDateAr, formatDateShort } from "@/lib/dates";
import { hourLabel } from "@/lib/constants";

type BlackoutRow = {
  id: string;
  room_id: string | null;
  date: string;
  end_date?: string | null;
  start_hour: number;
  end_hour: number;
  reason: string;
  hide_day?: boolean;
  rooms?: { name: string } | null;
};

type Mode = "hours" | "full_day";

export function BlackoutsManager({
  blackouts,
  rooms,
  slotDurationMinutes = 60,
}: {
  blackouts: BlackoutRow[];
  rooms: Room[];
  slotDurationMinutes?: number;
}) {
  const step = slotDurationMinutes / 60;
  const [mode, setMode] = useState<Mode>("hours");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roomId, setRoomId] = useState<string>("all");
  const [start, setStart] = useState(19);
  const [end, setEnd] = useState(21);
  const [reason, setReason] = useState("");
  const [hideDay, setHideDay] = useState(true);
  const [meetingDate, setMeetingDate] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function resetForm() {
    setReason("");
    setEndDate("");
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-teal-3/40">
        <CardHeader>
          <CardTitle className="text-base">اجتماع الخدام الشهري</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>اختر يوم الثلاثاء</Label>
            <DatePicker
              value={meetingDate}
              onChange={setMeetingDate}
              placeholder="يوم الثلاثاء"
            />
          </div>
          <Button
            disabled={pending || !meetingDate}
            onClick={() => {
              startTransition(async () => {
                const res = await createMonthlyServantsMeeting(meetingDate);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("تم قفل كل الأماكن من 7 م");
                setMeetingDate("");
                router.refresh();
              });
            }}
          >
            قفل كل الأماكن من 7 م
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إضافة إغلاق / وقت مقفول</CardTitle>
          <p className="text-sm text-muted-foreground">
            قفل ساعات في تواريخ محددة (صوم، أفراح، خماسين…) أو إغلاق أيام كاملة
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>نوع الإغلاق</Label>
            <Select
              value={mode}
              onValueChange={(v) => {
                const next = v as Mode;
                setMode(next);
                if (next === "full_day") {
                  setRoomId("all");
                  setStart(0);
                  setEnd(24);
                  setHideDay(true);
                } else {
                  setStart(19);
                  setEnd(21);
                  setHideDay(false);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">قفل أوقات معيّنة</SelectItem>
                <SelectItem value="full_day">إغلاق يوم / أيام كاملة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{mode === "full_day" ? "من تاريخ" : "التاريخ"}</Label>
            <DatePicker value={date} onChange={setDate} placeholder="اختر التاريخ" />
          </div>
          <div className="space-y-2">
            <Label>إلى تاريخ (اختياري)</Label>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="نفس اليوم أو نهاية الفترة"
            />
          </div>

          {mode === "hours" && (
            <>
              <div className="space-y-2">
                <Label>المكان</Label>
                <Select value={roomId} onValueChange={setRoomId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأماكن</SelectItem>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2" />
              <div className="space-y-2">
                <Label>من الساعة</Label>
                <HourSelect
                  value={start}
                  onChange={setStart}
                  min={0}
                  maxExclusive={24}
                  step={step}
                  placeholder="من الساعة…"
                />
              </div>
              <div className="space-y-2">
                <Label>إلى الساعة</Label>
                <HourSelect
                  value={end}
                  onChange={setEnd}
                  min={step}
                  maxExclusive={25}
                  step={step}
                  placeholder="إلى الساعة…"
                />
              </div>
            </>
          )}

          {mode === "full_day" && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-3 sm:col-span-2">
              <div className="space-y-0.5">
                <Label htmlFor="hide-day" className="text-sm font-medium">
                  إخفاء الأيام من جدول الحجز
                </Label>
                <p className="text-xs text-muted-foreground">
                  اليوم مش هيظهر خالص في صفحة الحجز (مش بس مقفول)
                </p>
              </div>
              <Switch
                id="hide-day"
                checked={hideDay}
                onCheckedChange={setHideDay}
              />
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <Label>السبب</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: صوم العذراء / أفراح مارمرقس / خماسين"
            />
          </div>
          <Button
            className="sm:col-span-2"
            disabled={pending || !date || !reason.trim()}
            onClick={() => {
              startTransition(async () => {
                const res = await createBlackout({
                  room_id: mode === "full_day" || roomId === "all" ? null : roomId,
                  date,
                  end_date: endDate || null,
                  start_hour: mode === "full_day" ? 0 : start,
                  end_hour: mode === "full_day" ? 24 : end,
                  reason: reason.trim(),
                  hide_day: mode === "full_day" ? hideDay : false,
                });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(
                  mode === "full_day" ? "تم إغلاق الأيام" : "تم قفل الأوقات"
                );
                resetForm();
                router.refresh();
              });
            }}
          >
            {mode === "full_day" ? "إغلاق الأيام" : "قفل الأوقات"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {blackouts.map((b) => {
          const rangeLabel =
            b.end_date && b.end_date !== b.date
              ? `${formatDateShort(b.date)} → ${formatDateShort(b.end_date)}`
              : formatDateAr(b.date);
          const fullDay = b.start_hour === 0 && b.end_hour === 24;
          return (
            <Card key={b.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">{b.reason}</p>
                  <p className="text-sm text-muted-foreground">
                    {rangeLabel}
                    {" · "}
                    {fullDay
                      ? "يوم كامل"
                      : `${hourLabel(b.start_hour)} – ${hourLabel(b.end_hour)}`}
                    {" · "}
                    {b.room_id ? b.rooms?.name : "كل الأماكن"}
                    {b.hide_day ? " · مخفي من الحجز" : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    startTransition(async () => {
                      await deleteBlackout(b.id);
                      toast.success("تم الحذف");
                      router.refresh();
                    });
                  }}
                >
                  حذف
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
