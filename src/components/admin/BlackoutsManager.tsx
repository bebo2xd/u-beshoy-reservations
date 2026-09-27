"use client";

import { useState, useTransition } from "react";
import type { Room } from "@/lib/types";
import {
  createBlackout,
  createMonthlyServantsMeeting,
  deleteBlackout,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDateAr } from "@/lib/dates";
import { hourLabel } from "@/lib/constants";

type BlackoutRow = {
  id: string;
  room_id: string | null;
  date: string;
  start_hour: number;
  end_hour: number;
  reason: string;
  rooms?: { name: string } | null;
};

export function BlackoutsManager({
  blackouts,
  rooms,
}: {
  blackouts: BlackoutRow[];
  rooms: Room[];
}) {
  const [date, setDate] = useState("");
  const [roomId, setRoomId] = useState<string>("all");
  const [start, setStart] = useState(19);
  const [end, setEnd] = useState(21);
  const [reason, setReason] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-teal-3/40">
        <CardHeader>
          <CardTitle className="text-base">اجتماع الخدام الشهري</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>اختر يوم الثلاثاء</Label>
            <Input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
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
          <CardTitle className="text-base">إضافة وقت مقفول</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>التاريخ</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
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
          <div className="space-y-2">
            <Label>من</Label>
            <Input
              type="number"
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>إلى</Label>
            <Input type="number" value={end} onChange={(e) => setEnd(Number(e.target.value))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>السبب</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button
            className="sm:col-span-2"
            disabled={pending || !date || !reason}
            onClick={() => {
              startTransition(async () => {
                const res = await createBlackout({
                  room_id: roomId === "all" ? null : roomId,
                  date,
                  start_hour: start,
                  end_hour: end,
                  reason,
                });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("تم الإضافة");
                setReason("");
                router.refresh();
              });
            }}
          >
            إضافة
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {blackouts.map((b) => (
          <Card key={b.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{b.reason}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateAr(b.date)} · {hourLabel(b.start_hour)} – {hourLabel(b.end_hour)} ·{" "}
                  {b.room_id ? b.rooms?.name : "كل الأماكن"}
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
        ))}
      </div>
    </div>
  );
}
