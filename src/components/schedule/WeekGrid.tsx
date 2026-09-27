"use client";

import { hourLabel } from "@/lib/constants";
import { getBlocksForSlot } from "@/lib/availability";
import type { OccupancyBlock, Room, WeekDay } from "@/lib/types";
import { SlotCell } from "./SlotCell";
import { cn } from "@/lib/utils";

interface WeekGridProps {
  days: WeekDay[];
  rooms: Room[];
  hours: number[];
  occupancy: OccupancyBlock[];
  selectedRoomId?: string | null;
  selectedDate?: string | null;
  selectedHours?: number[];
  onSelectSlot?: (roomId: string, date: string, hour: number) => void;
  activeDay?: string;
}

export function WeekGrid({
  days,
  rooms,
  hours,
  occupancy,
  selectedRoomId,
  selectedDate,
  selectedHours = [],
  onSelectSlot,
  activeDay,
}: WeekGridProps) {
  const visibleDays = activeDay ? days.filter((d) => d.date === activeDay) : days;

  return (
    <div className="overflow-auto rounded-xl border border-border bg-card shadow-sm scrollbar-thin">
      <div className="min-w-[900px]">
        {visibleDays.map((day) => (
          <div key={day.date} className="border-b border-border last:border-b-0">
            <div className="sticky top-0 z-20 flex items-center gap-3 bg-sand-2 px-3 py-2.5 border-b border-border">
              <span className="rounded-lg bg-primary px-2.5 py-1 text-sm font-semibold text-primary-foreground">
                {day.label}
              </span>
              <span className="text-sm text-muted-foreground">{day.date}</span>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: `140px repeat(${hours.length}, minmax(64px, 1fr))`,
              }}
            >
              <div className="sticky right-0 z-10 bg-sand-2 border-l border-border px-2 py-2 text-xs font-semibold text-muted-foreground">
                المكان / الساعة
              </div>
              {hours.map((h) => (
                <div
                  key={h}
                  className="bg-sand-2 px-1 py-2 text-center text-[11px] font-medium text-muted-foreground border-l border-border"
                >
                  {hourLabel(h)}
                </div>
              ))}

              {rooms.map((room) => (
                <div key={`${day.date}-${room.id}`} className="contents">
                  <div
                    className="sticky right-0 z-10 flex items-center gap-2 border-t border-l border-border bg-card px-2 py-1 text-sm font-medium"
                    style={{ borderRightColor: room.color, borderRightWidth: 3 }}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: room.color }}
                    />
                    <span className="truncate">{room.name}</span>
                  </div>
                  {hours.map((h) => {
                    const blocks = getBlocksForSlot(occupancy, room.id, day.date, h);
                    const selected =
                      selectedRoomId === room.id &&
                      selectedDate === day.date &&
                      selectedHours.includes(h);
                    return (
                      <div key={h} className="border-t border-l border-border">
                        <SlotCell
                          hour={h}
                          blocks={blocks}
                          selected={selected}
                          compact
                          onClick={() => onSelectSlot?.(room.id, day.date, h)}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-card border border-border" /> متاح
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-primary" /> مختار
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-teal-9" /> موعد ثابت / محجوز
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-amber-3 border border-amber-9" /> قيد المراجعة
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={cn("h-3 w-3 rounded slot-striped border border-border")} /> مقفول
      </span>
    </div>
  );
}
