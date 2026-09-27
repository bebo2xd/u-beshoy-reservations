"use client";

import { useMemo, useState, useTransition } from "react";
import { WeekGrid, Legend } from "@/components/schedule/WeekGrid";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hoursList, selectionFromHours } from "@/lib/availability";
import { adminCreateBooking, addException } from "@/lib/actions/admin";
import type { AppSettings, OccupancyBlock, Room, WeekDay } from "@/lib/types";
import { getWeekStartFriday, addCalendarDays } from "@/lib/dates";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  days: WeekDay[];
  rooms: Room[];
  occupancy: OccupancyBlock[];
  settings: AppSettings;
  weekStart: string;
}

export function AdminCalendar({ days, rooms, occupancy, settings, weekStart }: Props) {
  const hours = useMemo(() => hoursList(settings), [settings]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const selection = selectionFromHours(selectedHours);

  function handleSelectSlot(roomId: string, date: string, hour: number) {
    if (selectedRoomId !== roomId || selectedDate !== date) {
      setSelectedRoomId(roomId);
      setSelectedDate(date);
      setSelectedHours([hour]);
      return;
    }
    setSelectedHours((prev) => {
      if (prev.includes(hour)) return prev.filter((h) => h !== hour);
      const next = [...prev, hour].sort((a, b) => a - b);
      for (let i = 1; i < next.length; i++) {
        if (next[i] !== next[i - 1] + 1) return prev;
      }
      return next;
    });
  }

  function goWeek(delta: number) {
    const next = addCalendarDays(weekStart, delta * 7);
    router.push(`/admin/calendar?week=${getWeekStartFriday(next)}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goWeek(-1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{weekStart}</span>
          <Button variant="outline" size="icon" onClick={() => goWeek(1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <Legend />
      </div>

      <WeekGrid
        days={days}
        rooms={rooms}
        hours={hours}
        occupancy={occupancy}
        selectedRoomId={selectedRoomId}
        selectedDate={selectedDate}
        selectedHours={selectedHours}
        onSelectSlot={handleSelectSlot}
      />

      {selection && selectedRoomId && selectedDate && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpen(true)}>إضافة حجز إداري للمواعيد المختارة</Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedRoomId(null);
              setSelectedDate(null);
              setSelectedHours([]);
            }}
          >
            مسح الاختيار
          </Button>
        </div>
      )}

      <ExceptionQuickAdd rooms={rooms} occupancy={occupancy} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حجز إداري مباشر (مُعتمد)</DialogTitle>
          </DialogHeader>
          {selection && selectedRoomId && selectedDate && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const res = await adminCreateBooking({
                    room_id: selectedRoomId,
                    booking_date: selectedDate,
                    start_hour: selection.start,
                    end_hour: selection.end,
                    service_name: String(fd.get("service_name")),
                    requester_name: String(fd.get("requester_name")),
                    requester_phone: String(fd.get("requester_phone")),
                    notes: String(fd.get("notes") || ""),
                  });
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("تم إنشاء الحجز");
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              <div className="space-y-2">
                <Label>اسم الخدمة</Label>
                <Input name="service_name" required />
              </div>
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input name="requester_name" required defaultValue="إدارة" />
              </div>
              <div className="space-y-2">
                <Label>التليفون</Label>
                <Input name="requester_phone" required dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input name="notes" />
              </div>
              <Button type="submit" disabled={pending} className="w-full">
                حفظ
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExceptionQuickAdd({
  rooms,
  occupancy,
}: {
  rooms: Room[];
  occupancy: OccupancyBlock[];
}) {
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const recurring = occupancy.filter((o) => o.kind === "recurring" && o.schedule_id);
  const unique = Array.from(
    new Map(recurring.map((r) => [r.schedule_id!, r])).values()
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold">استثناء موعد ثابت ليوم واحد</h3>
      <p className="text-xs text-muted-foreground">
        يلغي الموعد الثابت في تاريخ محدد فقط فيصبح المكان متاحاً للحجز
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Select value={scheduleId} onValueChange={setScheduleId}>
          <SelectTrigger>
            <SelectValue placeholder="اختر الموعد" />
          </SelectTrigger>
          <SelectContent>
            {unique.map((u) => {
              const room = rooms.find((r) => r.id === u.room_id);
              return (
                <SelectItem key={u.schedule_id} value={u.schedule_id!}>
                  {room?.name} — {u.title}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <DatePicker value={date} onChange={setDate} placeholder="تاريخ الاستثناء" />
        <Button
          disabled={pending || !scheduleId || !date}
          onClick={() => {
            startTransition(async () => {
              const res = await addException(scheduleId, date);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success("تم إضافة الاستثناء");
              router.refresh();
            });
          }}
        >
          إضافة استثناء
        </Button>
      </div>
    </div>
  );
}
