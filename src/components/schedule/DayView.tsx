"use client";

import { hourLabel } from "@/lib/constants";
import { getBlocksForSlot } from "@/lib/availability";
import type { OccupancyBlock, Room, WeekDay } from "@/lib/types";
import { SlotCell } from "./SlotCell";
import { cn } from "@/lib/utils";

interface DayViewProps {
  days: WeekDay[];
  activeDate: string;
  onChangeDate: (date: string) => void;
  rooms: Room[];
  hours: number[];
  occupancy: OccupancyBlock[];
  selectedRoomId?: string | null;
  selectedDate?: string | null;
  selectedHours?: number[];
  onSelectSlot?: (roomId: string, date: string, hour: number) => void;
}

export function DayView({
  days,
  activeDate,
  onChangeDate,
  rooms,
  hours,
  occupancy,
  selectedRoomId,
  selectedDate,
  selectedHours = [],
  onSelectSlot,
}: DayViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            onClick={() => onChangeDate(d.date)}
            className={cn(
              "shrink-0 rounded-xl border px-3 py-2 text-center transition-colors min-w-[72px]",
              activeDate === d.date
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary"
            )}
          >
            <div className="text-sm font-semibold">{d.shortLabel}</div>
            <div className="text-[11px] opacity-80">{d.date.slice(8)}/{d.date.slice(5, 7)}</div>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="rounded-xl border border-border bg-card p-3 shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: room.color }}
              />
              <h3 className="font-semibold">{room.name}</h3>
              {room.floor && (
                <span className="text-xs text-muted-foreground">({room.floor})</span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-5">
              {hours.map((h) => {
                const blocks = getBlocksForSlot(occupancy, room.id, activeDate, h);
                const selected =
                  selectedRoomId === room.id &&
                  selectedDate === activeDate &&
                  selectedHours.includes(h);
                return (
                  <div key={h} className="flex flex-col gap-0.5">
                    <span className="text-center text-[10px] text-muted-foreground">
                      {hourLabel(h)}
                    </span>
                    <SlotCell
                      hour={h}
                      blocks={blocks}
                      selected={selected}
                      compact
                      onClick={() => onSelectSlot?.(room.id, activeDate, h)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
