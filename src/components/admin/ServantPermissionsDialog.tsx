"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions";
import {
  getProfilePermissionsState,
  saveProfileCustomPermissions,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ServantPermissionsDialog({
  open,
  onOpenChange,
  profileId,
  profileName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  profileName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [roleLabel, setRoleLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getProfilePermissionsState(profileId)
      .then((res) => {
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setCustom(res.custom);
        setSelected(new Set(res.permissions));
        setRoleLabel(res.role === "admin" ? "أدمن" : "خادم");
      })
      .finally(() => setLoading(false));
  }, [open, profileId]);

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
      const res = await saveProfileCustomPermissions(
        profileId,
        custom,
        Array.from(selected)
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(custom ? "تم حفظ الصلاحيات الخاصة" : "تم الرجوع لصلاحيات الدور");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>صلاحيات: {profileName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            جاري التحميل...
          </p>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-sand-2 px-3 py-3">
              <div>
                <p className="font-semibold">صلاحيات خاصة</p>
                <p className="text-sm text-sand-11">
                  لو مقفولة، ياخد صلاحيات دور «{roleLabel}» الافتراضية
                </p>
              </div>
              <Switch checked={custom} onCheckedChange={setCustom} />
            </label>

            <div
              className={
                custom ? "space-y-2 opacity-100" : "pointer-events-none space-y-2 opacity-45"
              }
            >
              {PERMISSIONS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <Label className="font-medium">{perm.label}</Label>
                    <p className="text-xs text-sand-11">{perm.description}</p>
                  </div>
                  <Switch
                    checked={selected.has(perm.key)}
                    onCheckedChange={() => toggle(perm.key)}
                    disabled={!custom}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={save} disabled={pending || loading}>
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
