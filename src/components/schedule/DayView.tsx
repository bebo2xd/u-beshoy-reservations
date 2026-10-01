"use client";

import { hourLabel } from "@/lib/constants";
import { getBlocksForSlot } from "@/lib/availability";
import { todayCairo } from "@/lib/dates";
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
  const today = todayCairo();
  const activeIsPast = activeDate < today;

  return (
    <div className="space-y-5">
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
        {days.map((d, i) => {
          const isActive = activeDate === d.date;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onChangeDate(d.date)}
              className={cn(
                "shrink-0 rounded-2xl border px-3.5 py-3 text-center transition-all duration-200 min-w-[86px] active:scale-95",
                "animate-fade-in",
                `stagger-${Math.min(i + 1, 5)}`,
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]"
                  : "border-border bg-card hover:border-primary/40 hover:bg-teal-3"
              )}
            >
              <div className="text-base font-bold">{d.shortLabel}</div>
              <div className="mt-0.5 text-sm font-medium opacity-85">
                {d.date.slice(8)}/{d.date.slice(5, 7)}
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {rooms.map((room, idx) => (
          <div
            key={room.id}
            className={cn(
              "rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md animate-rise-in",
              `stagger-${Math.min((idx % 5) + 1, 5)}`
            )}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="h-3.5 w-3.5 rounded-full ring-2 ring-sand-3"
                style={{ backgroundColor: room.color }}
              />
              <h3 className="text-lg font-bold tracking-tight">{room.name}</h3>
              {room.floor && (
                <span className="rounded-lg bg-sand-3 px-2 py-0.5 text-sm font-medium text-sand-11">
                  {room.floor}
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {hours.map((h) => {
                const blocks = getBlocksForSlot(
                  occupancy,
                  room.id,
                  activeDate,
                  h
                );
                const selected =
                  !activeIsPast &&
                  selectedRoomId === room.id &&
                  selectedDate === activeDate &&
                  selectedHours.some((x) => Math.abs(x - h) < 1e-9);
                return (
                  <div key={h} className="flex flex-col gap-1">
                    <span className="text-center text-xs font-semibold text-sand-11">
                      {hourLabel(h)}
                    </span>
                    <SlotCell
                      hour={h}
                      blocks={blocks}
                      selected={selected}
                      past={activeIsPast}
                      compact
                      onClick={() =>
                        !activeIsPast &&
                        onSelectSlot?.(room.id, activeDate, h)
                      }
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
