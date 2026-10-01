"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { WeekGrid, Legend } from "@/components/schedule/WeekGrid";
import { DayView } from "@/components/schedule/DayView";
import { BookingForm } from "@/components/booking/BookingForm";
import { WeekPicker } from "@/components/booking/WeekPicker";
import { Button } from "@/components/ui/button";
import { hoursList, selectionFromHours } from "@/lib/availability";
import { rangeLabel, slotStepHours } from "@/lib/constants";
import {
  addCalendarDays,
  formatDateAr,
  getWeekStartFriday,
  todayCairo,
} from "@/lib/dates";
import type { AppSettings, OccupancyBlock, Room, WeekDay } from "@/lib/types";
import { toast } from "sonner";

interface BookingBoardProps {
  days: WeekDay[];
  rooms: Room[];
  occupancy: OccupancyBlock[];
  settings: AppSettings;
  weekStart: string;
  requesterName: string;
  requesterPhone: string;
}

export function BookingBoard({
  days,
  rooms,
  occupancy,
  settings,
  weekStart,
  requesterName,
  requesterPhone,
}: BookingBoardProps) {
  const router = useRouter();
  const [navigating, startNav] = useTransition();
  const hours = useMemo(() => hoursList(settings), [settings]);
  const step = useMemo(
    () => slotStepHours(settings.slot_duration_minutes ?? 60),
    [settings.slot_duration_minutes]
  );  const [activeDate, setActiveDate] = useState(() => {
    const today = todayCairo();
    if (days.some((d) => d.date === today)) return today;
    const upcoming = days.find((d) => d.date >= today);
    return upcoming?.date ?? days[0]?.date ?? "";
  });

  // عند تغيير الأسبوع، رجّع اليوم الحالي لو موجود في الأسبوع
  const daysKey = days.map((d) => d.date).join(",");
  const [prevDaysKey, setPrevDaysKey] = useState(daysKey);
  if (daysKey !== prevDaysKey) {
    setPrevDaysKey(daysKey);
    const today = todayCairo();
    if (days.some((d) => d.date === today)) setActiveDate(today);
    else {
      const upcoming = days.find((d) => d.date >= today);
      setActiveDate(upcoming?.date ?? days[0]?.date ?? "");
    }
  }
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  function handleSelectSlot(roomId: string, date: string, hour: number) {
    if (date < todayCairo()) {
      toast.message("مش هتقدر تحجز في تاريخ فات");
      return;
    }
    if (selectedRoomId !== roomId || selectedDate !== date) {
      setSelectedRoomId(roomId);
      setSelectedDate(date);
      setSelectedHours([hour]);
      return;
    }
    setSelectedHours((prev) => {
      if (prev.some((h) => Math.abs(h - hour) < 1e-9)) {
        return prev.filter((h) => Math.abs(h - hour) >= 1e-9);
      }
      const next = [...prev, hour].sort((a, b) => a - b);
      for (let i = 1; i < next.length; i++) {
        if (Math.abs(next[i] - next[i - 1] - step) > 1e-9) {
          toast.message(
            step < 1
              ? "اختر فترات متتالية من غير فواصل"
              : "اختر ساعات متتالية من غير فواصل"
          );
          return prev;
        }
      }
      return next;
    });
  }

  const selection = selectionFromHours(selectedHours, step);

  function clearSelection() {
    setSelectedRoomId(null);
    setSelectedDate(null);
    setSelectedHours([]);
  }

  function goWeek(delta: number) {
    const next = addCalendarDays(weekStart, delta * 7);
    goToFriday(getWeekStartFriday(next));
  }

  function goToFriday(friday: string) {
    if (friday === weekStart) return;
    startNav(() => {
      router.push(`/book?week=${friday}`);
    });
  }

  return (
    <div className={`space-y-5 ${navigating ? "opacity-60 transition-opacity" : ""}`}>
      <div className="rounded-2xl border border-teal-9/20 bg-teal-3 px-4 py-3 text-base text-teal-12 animate-fade-in">
        <p className="flex items-start gap-2 font-medium leading-relaxed">
          <Hand className="mt-0.5 h-5 w-5 shrink-0" />
          اضغط على الساعات المتاحة (بالأبيض) لاختيارها، ثم اضغط «متابعة الحجز». الساعات لازم تكون ورا بعض.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={() => goWeek(-1)}
            aria-label="الأسبوع السابق"
            disabled={navigating}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <WeekPicker
            weekStart={weekStart}
            onSelectWeek={goToFriday}
            disabled={navigating}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={() => goWeek(1)}
            aria-label="الأسبوع التالي"
            disabled={navigating}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <Legend />
      </div>

      <div className="hidden lg:block">
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
      </div>

      <div className="lg:hidden">
        <DayView
          days={days}
          activeDate={activeDate || days[0]?.date}
          onChangeDate={setActiveDate}
          rooms={rooms}
          hours={hours}
          occupancy={occupancy}
          selectedRoomId={selectedRoomId}
          selectedDate={selectedDate}
          selectedHours={selectedHours}
          onSelectSlot={handleSelectSlot}
        />
      </div>

      {selection && selectedRoom && selectedDate && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card p-4 shadow-[0_-8px_30px_rgba(33,32,28,0.12)] animate-bar-in">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-base leading-relaxed">
              <span className="font-bold text-lg">{selectedRoom.name}</span>
              <div className="mt-0.5 text-sand-11">
                {formatDateAr(selectedDate)}
                <span className="mx-2 text-sand-8">·</span>
                <span className="font-bold text-primary text-lg">
                  {rangeLabel(selection.start, selection.end)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={clearSelection}>
                إلغاء
              </Button>
              <Button size="lg" className="flex-1 sm:flex-none text-base" onClick={() => setFormOpen(true)}>
                متابعة الحجز
              </Button>
            </div>
          </div>
        </div>
      )}

      {selection && selectedRoom && selectedDate && (
        <BookingForm
          open={formOpen}
          onOpenChange={setFormOpen}
          roomId={selectedRoom.id}
          roomName={selectedRoom.name}
          date={selectedDate}
          startHour={selection.start}
          endHour={selection.end}
          importantNotes={settings.important_notes}
          requesterName={requesterName}
          requesterPhone={requesterPhone}
          onSuccess={clearSelection}
        />
      )}
    </div>
  );
}
