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
import { GripVertical, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Room } from "@/lib/types";
import { ROOM_COLORS } from "@/lib/constants";
import {
  reorderRooms,
  restoreRoom,
  softDeleteRoom,
  upsertRoom,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
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

type StatusFilter = "active" | "inactive" | "deleted" | "all";

const PAGE_SIZE = 25;

export function RoomsManager({ rooms: initialRooms }: { rooms: Room[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rooms, setRooms] = useState(initialRooms);
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Room> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setRooms(initialRooms);
  }, [initialRooms]);

  const floors = useMemo(() => {
    const set = new Set(
      rooms.map((r) => r.floor).filter((f): f is string => Boolean(f && f.trim()))
    );
    return Array.from(set).sort();
  }, [rooms]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms
      .filter((r) => {
        const deleted = Boolean(r.deleted_at);
        if (status === "active" && (deleted || !r.is_active)) return false;
        if (status === "inactive" && (deleted || r.is_active)) return false;
        if (status === "deleted" && !deleted) return false;
        if (floor !== "all" && (r.floor || "") !== floor) return false;
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          (r.floor || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [rooms, search, floor, status]);

  useEffect(() => {
    setPage(1);
  }, [search, floor, status]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const canDrag =
    mounted &&
    status !== "deleted" &&
    !search.trim() &&
    floor === "all" &&
    page === 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function openCreate() {
    setEditing({
      name: "",
      floor: "",
      color: ROOM_COLORS[rooms.filter((r) => !r.deleted_at).length % ROOM_COLORS.length],
      is_active: true,
    });
    setModalOpen(true);
  }

  function openEdit(room: Room) {
    setEditing({ ...room });
    setModalOpen(true);
  }

  function save() {
    if (!editing?.name?.trim()) {
      toast.error("الاسم مطلوب");
      return;
    }
    startTransition(async () => {
      const res = await upsertRoom({
        id: editing.id,
        name: editing.name!.trim(),
        floor: editing.floor ?? undefined,
        color: editing.color || ROOM_COLORS[0],
        is_active: editing.is_active ?? true,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("تم الحفظ");
      setModalOpen(false);
      setEditing(null);
      router.refresh();
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !canDrag) return;

    const oldIndex = filtered.findIndex((r) => r.id === active.id);
    const newIndex = filtered.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(filtered, oldIndex, newIndex);
    setRooms((prev) => {
      const map = new Map(next.map((r, i) => [r.id, i + 1]));
      return prev.map((r) =>
        map.has(r.id) ? { ...r, sort_order: map.get(r.id)! } : r
      );
    });

    startTransition(async () => {
      const res = await reorderRooms(next.map((r) => r.id));
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
              placeholder="بحث بالاسم أو الدور..."
              className="pr-10"
            />
          </div>
          <Select value={floor} onValueChange={setFloor}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="الدور" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأدوار</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
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
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          إضافة مكان
        </Button>
      </div>

      {canDrag && (
        <p className="text-sm text-sand-11">
          اسحب الصفوف من أيقونة ≡ لإعادة الترتيب (يظهر في صفحة الحجز بنفس الترتيب)
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead className="bg-sand-2 text-sand-11">
                <tr>
                  <th className="w-12 px-3 py-3 font-bold" />
                  <th className="px-3 py-3 font-bold">المكان</th>
                  <th className="px-3 py-3 font-bold">الدور</th>
                  <th className="px-3 py-3 font-bold">اللون</th>
                  <th className="px-3 py-3 font-bold">الحالة</th>
                  <th className="px-3 py-3 font-bold">إجراءات</th>
                </tr>
              </thead>
              <SortableContext
                items={pageItems.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
                disabled={!canDrag}
              >
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sand-11">
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((room) => (
                      <SortableRoomRow
                        key={room.id}
                        room={room}
                        canDrag={canDrag}
                        pending={pending}
                        onEdit={() => openEdit(room)}
                        onDelete={() => {
                          if (!confirm(`حذف «${room.name}»؟ (حذف ناعم ويمكن استرجاعه)`)) return;
                          startTransition(async () => {
                            const res = await softDeleteRoom(room.id);
                            if (!res.ok) toast.error(res.error);
                            else toast.success("تم الحذف");
                            router.refresh();
                          });
                        }}
                        onRestore={() => {
                          startTransition(async () => {
                            const res = await restoreRoom(room.id);
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل مكان" : "إضافة مكان"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>الاسم</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="مثال: كنيسة العذراء"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>الدور / المنطقة</Label>
                <Input
                  value={editing.floor ?? ""}
                  onChange={(e) => setEditing({ ...editing, floor: e.target.value })}
                  placeholder="مثال: الدور الثالث"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>اللون</Label>
                <div className="flex flex-wrap gap-2">
                  {ROOM_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="h-9 w-9 rounded-full border-2 transition-transform hover:scale-105"
                      style={{
                        backgroundColor: c,
                        borderColor: editing.color === c ? "#21201c" : "transparent",
                      }}
                      onClick={() => setEditing({ ...editing, color: c })}
                    />
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-base sm:col-span-2">
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                نشط (ظاهر في صفحة الحجز)
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

function SortableRoomRow({
  room,
  canDrag,
  pending,
  onEdit,
  onDelete,
  onRestore,
}: {
  room: Room;
  canDrag: boolean;
  pending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: room.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const deleted = Boolean(room.deleted_at);

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
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center gap-2 font-semibold">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: room.color }} />
          {room.name}
          {room.is_core && <Badge variant="muted">أساسي</Badge>}
        </div>
      </td>
      <td className="px-3 py-3 text-sand-11">{room.floor || "—"}</td>
      <td className="px-3 py-3">
        <span
          className="inline-block h-6 w-6 rounded-full border border-border"
          style={{ backgroundColor: room.color }}
        />
      </td>
      <td className="px-3 py-3">
        {deleted ? (
          <Badge variant="danger">محذوف</Badge>
        ) : room.is_active ? (
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
          ) : room.is_core ? (
            <span className="text-xs font-medium text-sand-11">
              للإيقاف: عدّل → أوقف النشاط
            </span>
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
