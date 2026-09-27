"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { AppRole } from "@/lib/types";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import { saveRolePermissionsAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PermissionsManager({
  initialRole,
  initialPermissions,
}: {
  initialRole: AppRole;
  initialPermissions: Record<AppRole, string[]>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<AppRole>(initialRole);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialPermissions[initialRole] ?? [])
  );

  useEffect(() => {
    setSelected(new Set(initialPermissions[role] ?? []));
  }, [role, initialPermissions]);

  function toggle(key: PermissionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const res = await saveRolePermissionsAction(role, Array.from(selected));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("تم حفظ صلاحيات الدور");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            عدّل الصلاحيات الافتراضية لكل دور. لو خادم محتاج صلاحيات مختلفة، افتحه من
            «الخدام» وفعّل «صلاحيات خاصة».
          </p>
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">دور الأدمن</SelectItem>
            <SelectItem value="servant">دور الخادم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <ul className="divide-y divide-border">
          {PERMISSIONS.map((perm) => {
            const on = selected.has(perm.key);
            return (
              <li
                key={perm.key}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{perm.label}</p>
                    {on && <Badge variant="success">مفعّل</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-sand-11">{perm.description}</p>
                </div>
                <Switch checked={on} onCheckedChange={() => toggle(perm.key)} />
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end border-t border-border px-4 py-3">
          <Button onClick={save} disabled={pending}>
            {pending ? "جاري الحفظ..." : "حفظ صلاحيات الدور"}
          </Button>
        </div>
      </div>
    </div>
  );
}
