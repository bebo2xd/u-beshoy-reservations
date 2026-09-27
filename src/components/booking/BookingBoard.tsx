"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { WeekGrid, Legend } from "@/components/schedule/WeekGrid";
import { DayView } from "@/components/schedule/DayView";
import { BookingForm } from "@/components/booking/BookingForm";
import { Button } from "@/components/ui/button";
import { hoursList, selectionFromHours } from "@/lib/availability";
import { rangeLabel } from "@/lib/constants";
import { formatDateAr, getWeekStartFriday } from "@/lib/dates";
import type { AppSettings, OccupancyBlock, Room, WeekDay } from "@/lib/types";
import { toast } from "sonner";

interface BookingBoardProps {
  days: WeekDay[];
  rooms: Room[];
  occupancy: OccupancyBlock[];
  settings: AppSettings;
  weekStart: string;
}

export function BookingBoard({
  days,
  rooms,
  occupancy,
  settings,
  weekStart,
}: BookingBoardProps) {
  const hours = useMemo(() => hoursList(settings), [settings]);
  const [activeDate, setActiveDate] = useState(days[0]?.date ?? "");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  function handleSelectSlot(roomId: string, date: string, hour: number) {
    if (selectedRoomId !== roomId || selectedDate !== date) {
      setSelectedRoomId(roomId);
      setSelectedDate(date);
      setSelectedHours([hour]);
      return;
    }
    setSelectedHours((prev) => {
      if (prev.includes(hour)) {
        return prev.filter((h) => h !== hour);
      }
      const next = [...prev, hour].sort((a, b) => a - b);
      // allow only contiguous
      for (let i = 1; i < next.length; i++) {
        if (next[i] !== next[i - 1] + 1) {
          toast.message("اختر ساعات متتالية");
          return prev;
        }
      }
      return next;
    });
  }

  const selection = selectionFromHours(selectedHours);

  function clearSelection() {
    setSelectedRoomId(null);
    setSelectedDate(null);
    setSelectedHours([]);
  }

  function goWeek(delta: number) {
    const next = format(
      addDays(parseISO(weekStart + "T12:00:00"), delta * 7),
      "yyyy-MM-dd"
    );
    const friday = getWeekStartFriday(next);
    window.location.href = `/book?week=${friday}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => goWeek(-1)} aria-label="الأسبوع السابق">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            أسبوع {formatDateAr(weekStart)}
          </div>
          <Button variant="outline" size="icon" onClick={() => goWeek(1)} aria-label="الأسبوع التالي">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <Legend />
      </div>

      {/* Desktop */}
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

      {/* Mobile / tablet */}
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="font-semibold">{selectedRoom.name}</span>
              <span className="mx-2 text-muted-foreground">|</span>
              <span>{formatDateAr(selectedDate)}</span>
              <span className="mx-2 text-muted-foreground">|</span>
              <span className="text-primary font-medium">
                {rangeLabel(selection.start, selection.end)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearSelection}>
                إلغاء الاختيار
              </Button>
              <Button onClick={() => setFormOpen(true)}>متابعة الحجز</Button>
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
          onSuccess={clearSelection}
        />
      )}
    </div>
  );
}
