"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { hourLabel } from "@/lib/constants";
import { getBlocksForSlot } from "@/lib/availability";
import { todayCairo } from "@/lib/dates";
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
  const gridColumns = `minmax(11rem, max-content) repeat(${hours.length}, minmax(72px, 1fr))`;
  const today = todayCairo();

  const defaultOpen = useMemo(() => {
    const set = new Set<string>();
    if (visibleDays.some((d) => d.date === today)) {
      set.add(today);
    } else if (visibleDays[0]) {
      // لو الأسبوع مش فيه النهاردة، افتح أول يوم
      set.add(visibleDays[0].date);
    }
    return set;
  }, [visibleDays, today]);

  const [openDays, setOpenDays] = useState<Set<string>>(defaultOpen);

  // لو اتغيرت أيام الأسبوع (تنقل أسبوع)، رجّع الافتراضي
  const daysKey = visibleDays.map((d) => d.date).join(",");
  const [prevDaysKey, setPrevDaysKey] = useState(daysKey);
  if (daysKey !== prevDaysKey) {
    setPrevDaysKey(daysKey);
    setOpenDays(defaultOpen);
  }

  function toggleDay(date: string) {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  const headerBg = (isPast: boolean) => (isPast ? "bg-sand-3" : "bg-sand-2");

  return (
    <div className="max-h-[calc(100dvh-11rem)] overflow-auto rounded-2xl border border-border bg-card shadow-sm scrollbar-thin animate-fade-in">
      <div className="min-w-max">
        {visibleDays.map((day) => {
          const open = openDays.has(day.date);
          const isToday = day.date === today;
          const isPast = day.date < today;
          const stickyBg = headerBg(isPast);

          return (
            <div key={day.date} className="border-b border-border last:border-b-0">
              <div
                className={cn(
                  "sticky top-0 z-20 border-b border-border",
                  stickyBg,
                  open && "shadow-md"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleDay(day.date)}
                  aria-expanded={open}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-right transition-colors",
                    isPast ? "hover:bg-sand-4" : "hover:bg-sand-3"
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-sand-11 transition-transform",
                      open ? "rotate-0" : "-rotate-90"
                    )}
                  />
                  <span
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-base font-bold",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : isPast
                          ? "bg-sand-4 text-sand-11 border border-sand-5"
                          : "bg-card text-foreground border border-border"
                    )}
                  >
                    {day.label}
                    {isToday ? " · اليوم" : ""}
                  </span>
                  <span
                    className={cn(
                      "text-base font-medium",
                      isPast ? "text-sand-11" : "text-muted-foreground"
                    )}
                  >
                    {day.date}
                  </span>
                  <span
                    className={cn(
                      "ms-auto text-sm font-semibold",
                      isPast ? "text-sand-11/80" : "text-sand-11"
                    )}
                  >
                    {open ? "إخفاء" : "عرض"}
                  </span>
                </button>

                {open && (
                  <div
                    className="grid border-t border-border"
                    style={{ gridTemplateColumns: gridColumns }}
                  >
                    <div
                      className={cn(
                        "sticky right-0 z-30 whitespace-nowrap border-l border-border px-3 py-3 text-sm font-bold text-muted-foreground",
                        stickyBg
                      )}
                    >
                      المكان / الساعة
                    </div>
                    {hours.map((h) => (
                      <div
                        key={h}
                        className={cn(
                          "border-l border-border px-1 py-3 text-center text-sm font-bold text-muted-foreground",
                          stickyBg
                        )}
                      >
                        {hourLabel(h)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {open && (
                <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
                  {rooms.map((room) => (
                    <div key={`${day.date}-${room.id}`} className="contents">
                      <div
                        className="sticky right-0 z-10 flex items-center gap-2.5 whitespace-nowrap border-t border-l border-border bg-card px-3 py-2 text-base font-bold"
                        style={{
                          borderRightColor: room.color,
                          borderRightWidth: 4,
                        }}
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: room.color }}
                        />
                        <span>{room.name}</span>
                      </div>
                      {hours.map((h) => {
                        const blocks = getBlocksForSlot(
                          occupancy,
                          room.id,
                          day.date,
                          h
                        );
                        const selected =
                          !isPast &&
                          selectedRoomId === room.id &&
                          selectedDate === day.date &&
                          selectedHours.includes(h);
                        return (
                          <div
                            key={h}
                            className="border-t border-l border-border p-0.5"
                          >
                            <SlotCell
                              hour={h}
                              blocks={blocks}
                              selected={selected}
                              past={isPast}
                              compact
                              onClick={() =>
                                !isPast &&
                                onSelectSlot?.(room.id, day.date, h)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-sand-11">
      <span className="inline-flex items-center gap-2">
        <span className="h-4 w-4 rounded-md bg-card border border-border shadow-sm" />{" "}
        متاح
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-4 w-4 rounded-md bg-primary" /> مختار
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-4 w-4 rounded-md bg-teal-9" /> موعد ثابت
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-4 w-4 rounded-md bg-amber-3 border border-amber-9" />{" "}
        قيد المراجعة
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className={cn("h-4 w-4 rounded-md slot-striped border border-border")}
        />{" "}
        مقفول
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-4 w-4 rounded-md bg-sand-4 border border-sand-5" />{" "}
        فاضي (ماضي)
      </span>
    </div>
  );
}
