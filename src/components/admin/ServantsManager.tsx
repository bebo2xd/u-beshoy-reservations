"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { KeyRound, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AppRole, Profile } from "@/lib/types";
import {
  restoreServant,
  softDeleteServant,
  upsertServant,
} from "@/lib/actions/admin";
import { ServantPermissionsDialog } from "@/components/admin/ServantPermissionsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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

type StatusFilter = "active" | "inactive" | "deleted" | "all";
type RoleFilter = "all" | AppRole;

const PAGE_SIZE = 25;

type FormState = {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  role: AppRole;
  is_active: boolean;
  password: string;
};

const emptyForm: FormState = {
  full_name: "",
  email: "",
  phone: "",
  role: "servant",
  is_active: true,
  password: "",
};

export function ServantsManager({ servants: initial }: { servants: Profile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [servants, setServants] = useState(initial);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [permsOpen, setPermsOpen] = useState(false);
  const [permsTarget, setPermsTarget] = useState<Profile | null>(null);

  useEffect(() => {
    setServants(initial);
  }, [initial]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return servants.filter((s) => {
      const deleted = Boolean(s.deleted_at);
      if (status === "active" && (deleted || !s.is_active)) return false;
      if (status === "inactive" && (deleted || s.is_active)) return false;
      if (status === "deleted" && !deleted) return false;
      if (role !== "all" && s.role !== role) return false;
      if (!q) return true;
      return (
        s.full_name.toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.phone || "").includes(q)
      );
    });
  }, [servants, search, role, status]);

  useEffect(() => {
    setPage(1);
  }, [search, role, status]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(s: Profile) {
    setForm({
      id: s.id,
      full_name: s.full_name,
      email: s.email || "",
      phone: s.phone,
      role: s.role,
      is_active: s.is_active,
      password: "",
    });
    setModalOpen(true);
  }

  function save() {
    if (!form) return;
    startTransition(async () => {
      const res = await upsertServant({
        id: form.id,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        is_active: form.is_active,
        password: form.password || undefined,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-11" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الإيميل أو التليفون..."
              className="pr-10"
            />
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as RoleFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="الصلاحية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الصلاحيات</SelectItem>
              <SelectItem value="admin">أدمن</SelectItem>
              <SelectItem value="servant">خادم</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
          >
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
          إضافة خادم
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-sm">
            <thead className="bg-sand-2 text-sand-11">
              <tr>
                <th className="px-3 py-3 font-bold">الاسم</th>
                <th className="px-3 py-3 font-bold">البريد</th>
                <th className="px-3 py-3 font-bold">التليفون</th>
                <th className="px-3 py-3 font-bold">الصلاحية</th>
                <th className="px-3 py-3 font-bold">الحالة</th>
                <th className="px-3 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sand-11">
                    لا توجد نتائج
                  </td>
                </tr>
              ) : (
                pageItems.map((s) => {
                  const deleted = Boolean(s.deleted_at);
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-border bg-card"
                    >
                      <td className="px-3 py-3 font-semibold">{s.full_name}</td>
                      <td className="px-3 py-3" dir="ltr">
                        {s.email || "—"}
                      </td>
                      <td className="px-3 py-3" dir="ltr">
                        {s.phone || "—"}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={s.role === "admin" ? "pending" : "muted"}>
                          {s.role === "admin" ? "أدمن" : "خادم"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        {deleted ? (
                          <Badge variant="danger">محذوف</Badge>
                        ) : s.is_active ? (
                          <Badge variant="success">نشط</Badge>
                        ) : (
                          <Badge variant="muted">موقوف</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {!deleted && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEdit(s)}
                                disabled={pending}
                              >
                                <Pencil className="h-4 w-4" />
                                تعديل
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setPermsTarget(s);
                                  setPermsOpen(true);
                                }}
                                disabled={pending}
                              >
                                <KeyRound className="h-4 w-4" />
                                صلاحيات
                              </Button>
                            </>
                          )}
                          {deleted ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={pending}
                              onClick={() => {
                                startTransition(async () => {
                                  const res = await restoreServant(s.id);
                                  if (!res.ok) toast.error(res.error);
                                  else toast.success("تم الاسترجاع");
                                  router.refresh();
                                });
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                              استرجاع
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={pending}
                              onClick={() => {
                                if (
                                  !confirm(
                                    `حذف «${s.full_name}»؟ (حذف ناعم ويمكن استرجاعه)`
                                  )
                                )
                                  return;
                                startTransition(async () => {
                                  const res = await softDeleteServant(s.id);
                                  if (!res.ok) toast.error(res.error);
                                  else toast.success("تم الحذف");
                                  router.refresh();
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              حذف
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
            <DialogTitle>
              {form?.id ? "تعديل خادم" : "إضافة خادم"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  placeholder="الاسم بالكامل"
                />
              </div>
              <div className="space-y-2">
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  dir="ltr"
                  className="text-left"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الواتساب</Label>
                <Input
                  dir="ltr"
                  className="text-left"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>الصلاحية</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) =>
                    setForm({ ...form, role: v as AppRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="servant">خادم (حجز فقط)</SelectItem>
                    <SelectItem value="admin">أدمن (لوحة كاملة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  كلمة المرور
                  {form.id ? " (اتركها فارغة للإبقاء على الحالية)" : ""}
                </Label>
                <PasswordInput
                  dir="ltr"
                  className="text-left"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  autoComplete="new-password"
                />
              </div>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">نشط (يقدر يسجّل دخول)</span>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
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

      {permsTarget && (
        <ServantPermissionsDialog
          open={permsOpen}
          onOpenChange={(open) => {
            setPermsOpen(open);
            if (!open) setPermsTarget(null);
          }}
          profileId={permsTarget.id}
          profileName={permsTarget.full_name}
        />
      )}
    </div>
  );
}
