"use client";

import { useState, useTransition } from "react";
import type { Room } from "@/lib/types";
import { ROOM_COLORS } from "@/lib/constants";
import { upsertRoom, deleteRoom } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RoomsManager({ rooms }: { rooms: Room[] }) {
  const [editing, setEditing] = useState<Partial<Room> | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    if (!editing?.name) {
      toast.error("الاسم مطلوب");
      return;
    }
    startTransition(async () => {
      const res = await upsertRoom({
        id: editing.id,
        name: editing.name!,
        floor: editing.floor ?? undefined,
        color: editing.color || ROOM_COLORS[0],
        sort_order: editing.sort_order ?? rooms.length + 1,
        is_active: editing.is_active ?? true,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("تم الحفظ");
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() =>
          setEditing({
            name: "",
            floor: "",
            color: ROOM_COLORS[rooms.length % ROOM_COLORS.length],
            sort_order: rooms.length + 1,
            is_active: true,
          })
        }
      >
        إضافة مكان
      </Button>

      {editing && (
        <Card>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input
                value={editing.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الدور / المنطقة</Label>
              <Input
                value={editing.floor ?? ""}
                onChange={(e) => setEditing({ ...editing, floor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الترتيب</Label>
              <Input
                type="number"
                value={editing.sort_order ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, sort_order: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>اللون</Label>
              <div className="flex flex-wrap gap-2">
                {ROOM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-8 w-8 rounded-full border-2"
                    style={{
                      backgroundColor: c,
                      borderColor: editing.color === c ? "#21201c" : "transparent",
                    }}
                    onClick={() => setEditing({ ...editing, color: c })}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Switch
                checked={editing.is_active ?? true}
                onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
              />
              نشط
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={save} disabled={pending}>
                حفظ
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: room.color }}
                />
                <div>
                  <p className="font-medium">
                    {room.name}{" "}
                    {!room.is_active && (
                      <span className="text-xs text-muted-foreground">(موقوف)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {room.floor || "بدون دور"} · ترتيب {room.sort_order}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(room)}>
                  تعديل
                </Button>
                {room.is_active && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      startTransition(async () => {
                        await deleteRoom(room.id);
                        toast.success("تم إيقاف المكان");
                        router.refresh();
                      });
                    }}
                  >
                    إيقاف
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
