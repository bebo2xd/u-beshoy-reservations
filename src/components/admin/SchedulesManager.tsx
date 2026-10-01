"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Room } from "@/lib/types";
import { DAY_NAMES_AR, WEEK_ORDER, hourLabel } from "@/lib/constants";
import {
  reorderSchedules,
  restoreSchedule,
  softDeleteSchedule,
  upsertSchedule,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { HourSelect } from "@/components/ui/hour-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { PaginationBar } from "@/components/admin/PaginationBar";
import { cn } from "@/lib/utils";

export type ScheduleRow = {
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
  sort_order: number;
  deleted_at?: string | null;
  rooms?: { name: string; color: string } | null;
};

type StatusFilter = "active" | "inactive" | "deleted" | "all";

const PAGE_SIZE = 25;

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
  schedules: initialSchedules,
  rooms,
  slotDurationMinutes = 60,
}: {
  schedules: ScheduleRow[];
  rooms: Room[];
  slotDurationMinutes?: number;
}) {
  const step = slotDurationMinutes / 60;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState("all");
  const [roomId, setRoomId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<(typeof emptyForm & { id?: string }) | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSchedules(initialSchedules);
  }, [initialSchedules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules
      .filter((s) => {
        const deleted = Boolean(s.deleted_at);
        if (status === "active" && (deleted || !s.is_active)) return false;
        if (status === "inactive" && (deleted || s.is_active)) return false;
        if (status === "deleted" && !deleted) return false;
        if (day !== "all" && s.day_of_week !== Number(day)) return false;
        if (roomId !== "all" && s.room_id !== roomId) return false;
        if (!q) return true;
        return (
          s.title.toLowerCase().includes(q) ||
          (s.rooms?.name || "").toLowerCase().includes(q) ||
          (s.notes || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [schedules, search, day, roomId, status]);

  useEffect(() => {
    setPage(1);
  }, [search, day, roomId, status]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canDrag =
    mounted &&
    status !== "deleted" &&
    !search.trim() &&
    day === "all" &&
    roomId === "all" &&
    page === 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function openCreate() {
    setForm({
      ...emptyForm,
      room_id: rooms[0]?.id ?? "",
    });
    setModalOpen(true);
  }

  function openEdit(s: ScheduleRow) {
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
    });
    setModalOpen(true);
  }

  function save() {
    if (!form || !form.room_id || !form.title.trim()) {
      toast.error("أكمل البيانات المطلوبة");
      return;
    }
    if (form.end_hour <= form.start_hour) {
      toast.error("ساعة النهاية لازم تكون بعد البداية");
      return;
    }
    startTransition(async () => {
      const res = await upsertSchedule({
        id: form.id,
        room_id: form.room_id,
        day_of_week: form.day_of_week,
        start_hour: form.start_hour,
        end_hour: form.end_hour,
        title: form.title.trim(),
        notes: form.notes,
        needs_review: false,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("تم الحفظ");
      setModalOpen(false);
      setForm(null);
      router.refresh();
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !canDrag) return;
    const oldIndex = filtered.findIndex((s) => s.id === active.id);
    const newIndex = filtered.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(filtered, oldIndex, newIndex);
    setSchedules((prev) => {
      const map = new Map(next.map((s, i) => [s.id, i + 1]));
      return prev.map((s) =>
        map.has(s.id) ? { ...s, sort_order: map.get(s.id)! } : s
      );
    });

    startTransition(async () => {
      const res = await reorderSchedules(next.map((s) => s.id));
      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
        return;
      }
      toast.success("تم تحديث الترتيب");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[240px]">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-11" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالعنوان أو المكان..."
              className="pr-10"
            />
          </div>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="اليوم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأيام</SelectItem>
              {WEEK_ORDER.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {DAY_NAMES_AR[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roomId} onValueChange={setRoomId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="المكان" />
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
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">موقوف</SelectItem>
              <SelectItem value="deleted">محذوف</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} disabled={rooms.length === 0}>
          <Plus className="h-4 w-4" />
          إضافة موعد
        </Button>
      </div>

      {canDrag && (
        <p className="text-sm text-sand-11">
          اسحب الصفوف من أيقونة ≡ لإعادة ترتيب عرض المواعيد
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead className="bg-sand-2 text-sand-11">
                <tr>
                  <th className="w-12 px-3 py-3 font-bold" />
                  <th className="px-3 py-3 font-bold">العنوان</th>
                  <th className="px-3 py-3 font-bold">المكان</th>
                  <th className="px-3 py-3 font-bold">اليوم</th>
                  <th className="px-3 py-3 font-bold">الوقت</th>
                  <th className="px-3 py-3 font-bold">الحالة</th>
                  <th className="px-3 py-3 font-bold">إجراءات</th>
                </tr>
              </thead>
              <SortableContext
                items={pageItems.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
                disabled={!canDrag}
              >
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sand-11">
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((s) => (
                      <SortableScheduleRow
                        key={s.id}
                        schedule={s}
                        canDrag={canDrag}
                        pending={pending}
                        onEdit={() => openEdit(s)}
                        onDelete={() => {
                          if (!confirm(`حذف موعد «${s.title}»؟ (حذف ناعم)`)) return;
                          startTransition(async () => {
                            const res = await softDeleteSchedule(s.id);
                            if (!res.ok) toast.error(res.error);
                            else toast.success("تم الحذف");
                            router.refresh();
                          });
                        }}
                        onRestore={() => {
                          startTransition(async () => {
                            const res = await restoreSchedule(s.id);
                            if (!res.ok) toast.error(res.error);
                            else toast.success("تم الاسترجاع");
                            router.refresh();
                          });
                        }}
                      />
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
        <PaginationBar
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? "تعديل موعد ثابت" : "إضافة موعد ثابت"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>عنوان الخدمة</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: اجتماع الخدام / ابتدائي"
                />
              </div>
              <div className="flex flex-col gap-2">
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
              <div className="flex flex-col gap-2">
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
              <div className="flex flex-col gap-2">
                <Label>من الساعة</Label>
                <HourSelect
                  value={form.start_hour}
                  onChange={(start_hour) => setForm({ ...form, start_hour })}
                  min={0}
                  maxExclusive={24}
                  step={step}
                  placeholder="من الساعة…"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>إلى الساعة</Label>
                <HourSelect
                  value={form.end_hour}
                  onChange={(end_hour) => setForm({ ...form, end_hour })}
                  min={step}
                  maxExclusive={25}
                  step={step}
                  placeholder="إلى الساعة…"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>صالح من</Label>
                <DatePicker
                  value={form.valid_from}
                  onChange={(valid_from) => setForm({ ...form, valid_from })}
                  placeholder="من تاريخ"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>صالح حتى</Label>
                <DatePicker
                  value={form.valid_until}
                  onChange={(valid_until) => setForm({ ...form, valid_until })}
                  placeholder="حتى تاريخ"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>ملاحظات</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="ملاحظات اختيارية…"
                />
              </div>
              <label className="flex items-center gap-2 text-base">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                نشط
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={save} disabled={pending}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableScheduleRow({
  schedule,
  canDrag,
  pending,
  onEdit,
  onDelete,
  onRestore,
}: {
  schedule: ScheduleRow;
  canDrag: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: schedule.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const deleted = Boolean(schedule.deleted_at);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-t border-border bg-card",
        isDragging && "z-10 bg-teal-3 shadow-md",
        deleted && "opacity-70"
      )}
    >
      <td className="px-2 py-3">
        <button
          type="button"
          className={cn(
            "rounded-lg p-1.5 text-sand-11",
            canDrag ? "cursor-grab active:cursor-grabbing hover:bg-sand-3" : "cursor-not-allowed opacity-30"
          )}
          disabled={!canDrag}
          aria-label="سحب لإعادة الترتيب"
          {...(canDrag ? { ...attributes, ...listeners } : {})}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      </td>
      <td className="px-3 py-3 font-semibold">{schedule.title}</td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: schedule.rooms?.color || "#8d8d86" }}
          />
          {schedule.rooms?.name || "—"}
        </span>
      </td>
      <td className="px-3 py-3">{DAY_NAMES_AR[schedule.day_of_week]}</td>
      <td className="px-3 py-3 font-medium" dir="ltr">
        {hourLabel(schedule.start_hour)} – {hourLabel(schedule.end_hour)}
      </td>
      <td className="px-3 py-3">
        {deleted ? (
          <Badge variant="danger">محذوف</Badge>
        ) : schedule.is_active ? (
          <Badge variant="success">نشط</Badge>
        ) : (
          <Badge variant="muted">موقوف</Badge>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-2">
          {!deleted && (
            <Button size="sm" variant="outline" onClick={onEdit} disabled={pending}>
              <Pencil className="h-4 w-4" />
              تعديل
            </Button>
          )}
          {deleted ? (
            <Button size="sm" variant="secondary" onClick={onRestore} disabled={pending}>
              <RotateCcw className="h-4 w-4" />
              استرجاع
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={pending}>
              <Trash2 className="h-4 w-4" />
              حذف
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
