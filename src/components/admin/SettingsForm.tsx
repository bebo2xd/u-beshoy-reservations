"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Mail,
  MessageCircle,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Smartphone,
  Users,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AppSettings } from "@/lib/types";
import type { NotificationPrefs } from "@/lib/notify/prefs";
import { mergeNotificationPrefs } from "@/lib/notify/prefs";
import type { NotifyAdminRecipient } from "@/lib/notify/recipients";
import {
  evolutionCreateInstanceAction,
  evolutionLogoutAction,
  evolutionQrAction,
  evolutionStatusAction,
  evolutionTestSendAction,
  testSmtpAction,
  updateEvolutionSettingsAction,
  updateNotificationPrefsAction,
  updateSettings,
  updateSmtpSettingsAction,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HourSelect } from "@/components/ui/hour-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SettingsFormProps = {
  settings: AppSettings & {
    has_evolution_api_key?: boolean;
    has_smtp_password?: boolean;
  };
  admins?: NotifyAdminRecipient[];
};

function adminInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`;
}

const NOTIFY_GROUPS: {
  id: string;
  title: string;
  description: string;
  icon: typeof Bell;
  /** Tailwind classes for the channel accent */
  accent: string;
  accentSoft: string;
  border: string;
  dot: string;
  items: {
    key: keyof NotificationPrefs;
    label: string;
    hint: string;
  }[];
}[] = [
  {
    id: "whatsapp",
    title: "واتساب",
    description: "رسائل عبر Evolution API",
    icon: MessageCircle,
    accent: "text-green-11",
    accentSoft: "bg-green-3 text-green-11",
    border: "border-green-9/35",
    dot: "bg-green-9",
    items: [
      {
        key: "new_booking_whatsapp_admin",
        label: "طلب جديد → الأدمن",
        hint: "لما ييجي طلب حجز جديد",
      },
      {
        key: "decision_whatsapp_requester",
        label: "موافقة / رفض → مقدم الطلب",
        hint: "يبلغ الخادم بنتيجة الطلب",
      },
      {
        key: "decision_whatsapp_admin",
        label: "موافقة / رفض → الأدمن",
        hint: "نسخة تأكيد للأدمن بعد البت",
      },
      {
        key: "cancel_whatsapp_requester",
        label: "إلغاء → مقدم الطلب",
        hint: "لما يتلغي حجز",
      },
      {
        key: "cancel_whatsapp_admin",
        label: "إلغاء → الأدمن",
        hint: "تنبيه الأدمن بالإلغاء",
      },
      {
        key: "admin_booking_whatsapp",
        label: "حجز يدوي من التقويم",
        hint: "تأكيد لصاحب الحجز عند الإضافة من الأدمن",
      },
    ],
  },
  {
    id: "push",
    title: "إشعارات Push",
    description: "تنبيهات تطبيق الأندرويد (OneSignal)",
    icon: Smartphone,
    accent: "text-teal-11",
    accentSoft: "bg-teal-3 text-teal-11",
    border: "border-teal-9/35",
    dot: "bg-teal-9",
    items: [
      {
        key: "new_booking_push_admin",
        label: "طلب جديد → الأدمن",
        hint: "يفتح صفحة الموافقة داخل التطبيق",
      },
      {
        key: "decision_push_requester",
        label: "موافقة / رفض → مقدم الطلب",
        hint: "يبلغ الخادم بالنتيجة على التطبيق",
      },
    ],
  },
  {
    id: "email",
    title: "إيميل",
    description: "بريد عبر SMTP — اضبطه من تاب الإيميل",
    icon: Mail,
    accent: "text-amber-11",
    accentSoft: "bg-amber-3 text-amber-11",
    border: "border-amber-9/35",
    dot: "bg-amber-9",
    items: [
      {
        key: "new_booking_email",
        label: "طلب جديد → الأدمن",
        hint: "",
      },
    ],
  },
];

function stateBadge(state: string) {
  const s = state.toLowerCase();
  if (["open", "connected", "online"].some((x) => s.includes(x))) {
    return <Badge variant="success">متصل</Badge>;
  }
  if (["close", "disconnected", "offline"].some((x) => s.includes(x))) {
    return <Badge variant="danger">غير متصل</Badge>;
  }
  if (s === "unconfigured") {
    return <Badge variant="muted">غير مضبوط</Badge>;
  }
  return <Badge variant="pending">{state}</Badge>;
}

export function SettingsForm({
  settings,
  admins = [],
}: SettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [general, setGeneral] = useState({
    site_title: settings.site_title,
    open_hour: settings.open_hour,
    close_hour: settings.close_hour,
    max_weeks_ahead: settings.max_weeks_ahead,
    week_start_day: settings.week_start_day,
    slot_duration_minutes: (settings.slot_duration_minutes ?? 60) as 30 | 60,
    important_notes: settings.important_notes,
  });
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    mergeNotificationPrefs(settings.notification_prefs)
  );
  const [notifyAdminIds, setNotifyAdminIds] = useState<string[]>(() => {
    const stored = settings.notify_admin_ids;
    if (stored && stored.length > 0) return stored;
    return admins.map((a) => a.id);
  });
  const [adminsOpen, setAdminsOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [evo, setEvo] = useState({
    evolution_url: settings.evolution_url ?? "",
    evolution_api_key: "",
    evolution_instance: settings.evolution_instance ?? "",
    admin_whatsapp: settings.admin_whatsapp ?? "",
  });
  const [hasKey] = useState(Boolean(settings.has_evolution_api_key));
  const [hasSmtpPass] = useState(Boolean(settings.has_smtp_password));
  const [smtp, setSmtp] = useState({
    smtp_host: settings.smtp_host ?? "",
    smtp_port: settings.smtp_port ?? 587,
    smtp_secure: Boolean(settings.smtp_secure),
    smtp_user: settings.smtp_user ?? "",
    smtp_password: "",
    smtp_from: settings.smtp_from ?? "",
    admin_email: settings.admin_email ?? "",
  });
  const [waState, setWaState] = useState("—");
  const [qr, setQr] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [testPhone, setTestPhone] = useState(settings.admin_whatsapp ?? "");

  const emailConfigured = Boolean(
    smtp.smtp_host.trim() &&
      smtp.smtp_user.trim() &&
      (hasSmtpPass || smtp.smtp_password.trim()) &&
      smtp.admin_email.trim() &&
      (smtp.smtp_from.trim() || smtp.smtp_user.trim())
  );

  const allAdminsSelected =
    admins.length > 0 &&
    admins.every((a) => notifyAdminIds.includes(a.id));
  const notifySelectionLabel = allAdminsSelected
    ? "كل الأدمنز"
    : notifyAdminIds.length === 0
      ? "مفيش تحديد"
      : `${notifyAdminIds.length} / ${admins.length}`;

  const selectedAdmins = admins.filter((a) => notifyAdminIds.includes(a.id));
  const adminQuery = adminSearch.trim().toLowerCase();
  const filteredAdmins = adminQuery
    ? admins.filter((a) => {
        const hay = [a.full_name, a.phone, a.email ?? ""]
          .join(" ")
          .toLowerCase();
        return hay.includes(adminQuery);
      })
    : admins;

  const toggleNotifyAdmin = (id: string, checked: boolean) => {
    setNotifyAdminIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const refreshStatus = useCallback(async () => {
    const res = await evolutionStatusAction();
    if ("state" in res && res.state) setWaState(String(res.state));
    if (!res.ok && "error" in res && res.error && res.state === "unconfigured") {
      setWaState("unconfigured");
    }
    return res;
  }, []);

  useEffect(() => {
    refreshStatus().catch(() => undefined);
  }, [refreshStatus]);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(async () => {
      const res = await refreshStatus();
      const state = "state" in res ? String(res.state).toLowerCase() : "";
      if (["open", "connected", "online"].some((x) => state.includes(x))) {
        setPolling(false);
        setQr(null);
        toast.success("تم ربط الواتساب بنجاح");
      }
    }, 4000);
    return () => clearInterval(id);
  }, [polling, refreshStatus]);

  return (
    <Tabs defaultValue="general" dir="rtl" className="w-full">
      <TabsList>
        <TabsTrigger value="general">
          <Settings2 className="h-4 w-4" />
          عام
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="h-4 w-4" />
          التنبيهات
        </TabsTrigger>
        <TabsTrigger value="whatsapp">
          <MessageCircle className="h-4 w-4" />
          واتساب
        </TabsTrigger>
        <TabsTrigger value="email">
          <Mail className="h-4 w-4" />
          إيميل
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>إعدادات عامة</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>عنوان الموقع</Label>
              <Input
                value={general.site_title}
                onChange={(e) =>
                  setGeneral({ ...general, site_title: e.target.value })
                }
                placeholder="مثال: حجز غرف مبنى الخدمات"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>مدة الفترة (Slot)</Label>
              <Select
                value={String(general.slot_duration_minutes)}
                onValueChange={(v) => {
                  const slot_duration_minutes = Number(v) as 30 | 60;
                  const step = slot_duration_minutes / 60;
                  const snap = (h: number) =>
                    Math.round(h / step) * step;
                  setGeneral({
                    ...general,
                    slot_duration_minutes,
                    open_hour: snap(general.open_hour),
                    close_hour: snap(general.close_hour),
                  });
                }}
              >
                <SelectTrigger className="h-12 rounded-xl text-base font-semibold">
                  <SelectValue placeholder="مدة الفترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">كل ساعة</SelectItem>
                  <SelectItem value="30">كل نصف ساعة</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                بيحدد خانات الجدول واختيارات ساعة البداية/النهاية
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>بداية الأسبوع</Label>
              <Select
                value={String(general.week_start_day)}
                onValueChange={(v) =>
                  setGeneral({ ...general, week_start_day: Number(v) })
                }
              >
                <SelectTrigger className="h-12 rounded-xl text-base font-semibold">
                  <SelectValue placeholder="اختر يوم البداية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">الجمعة</SelectItem>
                  <SelectItem value="6">السبت</SelectItem>
                  <SelectItem value="0">الأحد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>ساعة البداية</Label>
              <HourSelect
                value={general.open_hour}
                onChange={(open_hour) => setGeneral({ ...general, open_hour })}
                min={0}
                maxExclusive={24}
                step={general.slot_duration_minutes / 60}
                placeholder="من الساعة…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>ساعة النهاية</Label>
              <HourSelect
                value={general.close_hour}
                onChange={(close_hour) =>
                  setGeneral({ ...general, close_hour })
                }
                min={general.slot_duration_minutes / 60}
                maxExclusive={25}
                step={general.slot_duration_minutes / 60}
                placeholder="إلى الساعة…"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>أقصى أسابيع للحجز مقدماً</Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={general.max_weeks_ahead}
                onChange={(e) =>
                  setGeneral({
                    ...general,
                    max_weeks_ahead: Number(e.target.value),
                  })
                }
                placeholder="مثال: 4"
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>الملاحظات الهامة</Label>
              <Textarea
                className="min-h-[160px]"
                value={general.important_notes}
                onChange={(e) =>
                  setGeneral({ ...general, important_notes: e.target.value })
                }
                placeholder="ملاحظات تظهر لمقدم الطلب قبل تأكيد الحجز…"
              />
            </div>
            <Button
              className="sm:col-span-2 gap-2"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await updateSettings(general);
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success("تم حفظ الإعدادات العامة");
                    router.refresh();
                  }
                });
              }}
            >
              <Save className="h-4 w-4" />
              حفظ
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notifications">
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold">التنبيهات</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              مقسّمة حسب القناة — فعّل اللي محتاجه بس
            </p>
          </div>

          <Card className="overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => setAdminsOpen((o) => !o)}
              className="flex w-full items-start gap-3 p-5 text-start transition-colors hover:bg-sand-2/60"
              aria-expanded={adminsOpen}
            >
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    مين يستلم إشعارات الأدمن؟
                  </CardTitle>
                  <Badge variant="muted" className="tabular-nums">
                    {notifySelectionLabel}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Push · واتساب · إيميل — لو الكل متعلم، الأدمن الجديد هيستلم
                  تلقائي
                </p>
                {!adminsOpen && selectedAdmins.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(allAdminsSelected
                      ? [{ id: "__all", full_name: "كل الأدمنز" }]
                      : selectedAdmins.slice(0, 4)
                    ).map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex max-w-[160px] items-center gap-1.5 rounded-full bg-teal-3 px-2.5 py-1 text-xs font-medium text-teal-11"
                      >
                        <span className="truncate">
                          {a.full_name || "بدون اسم"}
                        </span>
                      </span>
                    ))}
                    {!allAdminsSelected && selectedAdmins.length > 4 ? (
                      <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        +{selectedAdmins.length - 4}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {!adminsOpen && selectedAdmins.length === 0 ? (
                  <p className="mt-2 text-sm text-amber-11">
                    مفيش تحديد — هيتبعت للكل عند الحفظ
                  </p>
                ) : null}
              </div>
              <ChevronDown
                className={cn(
                  "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                  adminsOpen && "rotate-180"
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                adminsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-3 border-t border-border px-5 pb-5 pt-4">
                  {admins.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3.5 py-4 text-sm text-muted-foreground">
                      مفيش أدمنز نشطين حالياً.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative min-w-0 flex-1">
                          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={adminSearch}
                            onChange={(e) => setAdminSearch(e.target.value)}
                            placeholder="بحث بالاسم أو الإيميل أو التليفون..."
                            className="pr-10"
                          />
                          {adminSearch ? (
                            <button
                              type="button"
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                              onClick={() => setAdminSearch("")}
                              aria-label="مسح البحث"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setNotifyAdminIds(admins.map((a) => a.id))
                            }
                          >
                            الكل
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setNotifyAdminIds([])}
                          >
                            مسح
                          </Button>
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-border/80">
                        <div className="max-h-64 space-y-0 overflow-y-auto overscroll-contain divide-y divide-border/70 sm:max-h-80">
                          {filteredAdmins.length === 0 ? (
                            <p className="px-3.5 py-8 text-center text-sm text-muted-foreground">
                              مفيش نتائج لـ «{adminSearch.trim()}»
                            </p>
                          ) : (
                            filteredAdmins.map((admin) => {
                              const checked = notifyAdminIds.includes(
                                admin.id
                              );
                              return (
                                <label
                                  key={admin.id}
                                  className={cn(
                                    "flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors hover:bg-sand-2/80",
                                    checked && "bg-teal-3/40"
                                  )}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) =>
                                      toggleNotifyAdmin(admin.id, v === true)
                                    }
                                  />
                                  <span
                                    className={cn(
                                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase",
                                      checked
                                        ? "bg-teal-9 text-white"
                                        : "bg-secondary text-muted-foreground"
                                    )}
                                    aria-hidden
                                  >
                                    {adminInitials(admin.full_name || "?")}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold leading-snug">
                                      {admin.full_name || "بدون اسم"}
                                    </p>
                                    <p
                                      className="mt-0.5 truncate text-sm text-muted-foreground"
                                      dir="ltr"
                                    >
                                      {[admin.phone, admin.email]
                                        .filter(Boolean)
                                        .join(" · ") ||
                                        "مفيش تليفون أو إيميل على البروفايل"}
                                    </p>
                                  </div>
                                  {checked ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-9" />
                                  ) : null}
                                </label>
                              );
                            })
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-border/80 bg-secondary/40 px-3.5 py-2 text-xs text-muted-foreground">
                          <span>
                            ظاهر {filteredAdmins.length} من {admins.length}
                          </span>
                          <span className="tabular-nums">
                            محدد {notifyAdminIds.length}
                          </span>
                        </div>
                      </div>

                      {notifyAdminIds.length === 0 ? (
                        <p className="text-sm text-amber-11">
                          لو حفظت من غير تحديد، هيتبعت لكل الأدمنز النشطين.
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {NOTIFY_GROUPS.map((group) => {
            const Icon = group.icon;
            const enabledCount = group.items.filter((i) => prefs[i.key]).length;
            return (
              <Card key={group.id} className={`overflow-hidden border ${group.border}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${group.accentSoft}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className={`text-base ${group.accent}`}>
                          {group.title}
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="muted" className="shrink-0 tabular-nums">
                      {enabledCount}/{group.items.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {group.items.map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 transition-colors hover:bg-sand-2/80"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${group.dot}`}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug">
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {item.key === "new_booking_email"
                              ? emailConfigured
                                ? "SMTP جاهز — هيتبعت لإيميلات الأدمنز المحددين"
                                : "يتطلب إعداد SMTP من تاب الإيميل"
                              : item.hint}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={prefs[item.key]}
                        onCheckedChange={(v) =>
                          setPrefs({ ...prefs, [item.key]: v })
                        }
                      />
                    </label>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          <div className="sticky bottom-3 z-10 flex justify-end">
            <Button
              className="gap-2 shadow-md"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const idsToSave = allAdminsSelected ? null : notifyAdminIds;
                  const res = await updateNotificationPrefsAction(
                    prefs,
                    idsToSave
                  );
                  if (!res.ok) toast.error(res.error);
                  else toast.success("تم حفظ إعدادات التنبيهات");
                });
              }}
            >
              <Save className="h-4 w-4" />
              حفظ التنبيهات
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="whatsapp">
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>بيانات Evolution API</CardTitle>
              <div className="flex items-center gap-2">
                {stateBadge(waState)}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    startTransition(async () => {
                      await refreshStatus();
                      toast.message("تم تحديث الحالة");
                    });
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label>رابط السيرفر (EVOLUTION_URL)</Label>
                <Input
                  dir="ltr"
                  className="text-left"
                  placeholder="https://evolution.example.com"
                  value={evo.evolution_url}
                  onChange={(e) =>
                    setEvo({ ...evo, evolution_url: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>
                  API Key
                  {hasKey ? " (اتركه فاضي للإبقاء على المحفوظ)" : ""}
                </Label>
                <PasswordInput
                  dir="ltr"
                  className="text-left"
                  placeholder={hasKey ? "••••••••••••" : "مفتاح الـ API"}
                  value={evo.evolution_api_key}
                  onChange={(e) =>
                    setEvo({ ...evo, evolution_api_key: e.target.value })
                  }
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>اسم الـ Instance</Label>
                <Input
                  dir="ltr"
                  className="text-left"
                  value={evo.evolution_instance}
                  onChange={(e) =>
                    setEvo({ ...evo, evolution_instance: e.target.value })
                  }
                  placeholder="اسم الـ Instance"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>واتساب الأدمن (للإشعارات والاختبار)</Label>
                <Input
                  dir="ltr"
                  className="text-left"
                  placeholder="01xxxxxxxxx"
                  value={evo.admin_whatsapp}
                  onChange={(e) =>
                    setEvo({ ...evo, admin_whatsapp: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={pending}
                  className="gap-2"
                  onClick={() => {
                    startTransition(async () => {
                      const res = await updateEvolutionSettingsAction({
                        ...evo,
                        keep_api_key: !evo.evolution_api_key.trim() && hasKey,
                      });
                      if (!res.ok) toast.error(res.error);
                      else {
                        toast.success("تم حفظ بيانات Evolution");
                        router.refresh();
                        await refreshStatus();
                      }
                    });
                  }}
                >
                  <Save className="h-4 w-4" />
                  حفظ البيانات
                </Button>
                <Button
                  variant="secondary"
                  disabled={pending || !evo.evolution_instance.trim()}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await evolutionCreateInstanceAction(
                        evo.evolution_instance
                      );
                      if (!res.ok) toast.error(res.error);
                      else {
                        toast.success("تم إنشاء/تأكيد الـ Instance");
                        if (res.qr) {
                          setQr(res.qr);
                          setPolling(true);
                        }
                        await refreshStatus();
                      }
                    });
                  }}
                >
                  إنشاء Instance
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                ربط الواتساب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-sand-11">
                اضغط «عرض QR» وامسح الكود من واتساب → الأجهزة المرتبطة. الصفحة
                هتراقب الاتصال تلقائياً.
              </p>

              <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border bg-sand-2 p-4">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qr}
                    alt="WhatsApp QR"
                    className="max-h-64 w-auto rounded-lg bg-white p-2"
                  />
                ) : (
                  <div className="text-center text-sand-11">
                    {polling ? (
                      <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
                    ) : waState.toLowerCase().includes("open") ||
                      waState.toLowerCase().includes("connected") ? (
                      <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-11" />
                    ) : (
                      <WifiOff className="mx-auto mb-2 h-10 w-10" />
                    )}
                    <p className="font-medium">
                      {waState.toLowerCase().includes("open") ||
                      waState.toLowerCase().includes("connected")
                        ? "الواتساب متصل"
                        : "مفيش QR معروض حالياً"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={pending}
                  className="gap-2"
                  onClick={() => {
                    startTransition(async () => {
                      const res = await evolutionQrAction();
                      if (!res.ok) {
                        toast.error(res.error);
                        return;
                      }
                      setQr(res.qr);
                      setPolling(true);
                      toast.success("امسح الـ QR من الموبايل");
                    });
                  }}
                >
                  <QrCode className="h-4 w-4" />
                  عرض QR
                </Button>
                <Button
                  variant="outline"
                  disabled={pending}
                  className="gap-2"
                  onClick={() => {
                    startTransition(async () => {
                      await refreshStatus();
                    });
                  }}
                >
                  <Wifi className="h-4 w-4" />
                  تحديث الحالة
                </Button>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("فصل الواتساب عن الـ Instance؟")) return;
                    startTransition(async () => {
                      const res = await evolutionLogoutAction();
                      if (!res.ok) toast.error(res.error);
                      else {
                        toast.success("تم فصل الواتساب");
                        setQr(null);
                        setPolling(false);
                        await refreshStatus();
                      }
                    });
                  }}
                >
                  فصل الواتساب
                </Button>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <Label>رسالة تجريبية</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    dir="ltr"
                    className="text-left sm:max-w-xs"
                    placeholder="01xxxxxxxxx"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await evolutionTestSendAction(testPhone);
                        if (!res.ok) toast.error(res.error);
                        else toast.success("تم إرسال رسالة الاختبار");
                      });
                    }}
                  >
                    إرسال اختبار
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="email">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>إعدادات SMTP</CardTitle>
            <Badge variant={emailConfigured ? "success" : "muted"}>
              {emailConfigured ? "مضبوط" : "غير مضبوط"}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm text-sand-11">
              إرسال مباشر عبر سيرفر البريد (Gmail / Hostinger / أي SMTP). القيم
              المحفوظة هنا لها أولوية على متغيرات البيئة.
            </p>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label>مضيف SMTP</Label>
              <Input
                dir="ltr"
                className="text-left"
                placeholder="smtp.gmail.com"
                value={smtp.smtp_host}
                onChange={(e) =>
                  setSmtp({ ...smtp, smtp_host: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>المنفذ (Port)</Label>
              <Input
                type="number"
                dir="ltr"
                className="text-left"
                value={smtp.smtp_port}
                onChange={(e) =>
                  setSmtp({
                    ...smtp,
                    smtp_port: Number(e.target.value) || 587,
                  })
                }
                placeholder="587 أو 465"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
                <div>
                  <p className="font-semibold">اتصال آمن (SSL/TLS)</p>
                  <p className="text-sm text-sand-11">
                    فعّله مع المنفذ 465 عادةً
                  </p>
                </div>
                <Switch
                  checked={smtp.smtp_secure}
                  onCheckedChange={(v) =>
                    setSmtp({ ...smtp, smtp_secure: v })
                  }
                />
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <Label>اسم المستخدم</Label>
              <Input
                dir="ltr"
                className="text-left"
                placeholder="user@example.com"
                value={smtp.smtp_user}
                onChange={(e) =>
                  setSmtp({ ...smtp, smtp_user: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>
                كلمة المرور
                {hasSmtpPass ? " (اتركها فاضية للإبقاء على المحفوظة)" : ""}
              </Label>
              <PasswordInput
                dir="ltr"
                className="text-left"
                placeholder={hasSmtpPass ? "••••••••••••" : "كلمة مرور SMTP"}
                value={smtp.smtp_password}
                onChange={(e) =>
                  setSmtp({ ...smtp, smtp_password: e.target.value })
                }
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>عنوان المرسل (From) — الإيميل فقط</Label>
              <Input
                dir="ltr"
                className="text-left"
                placeholder="noreply@example.com"
                value={smtp.smtp_from}
                onChange={(e) =>
                  setSmtp({ ...smtp, smtp_from: e.target.value })
                }
              />
              <p className="text-xs text-sand-11">
                اسم المرسل الظاهر هيكون عنوان الموقع من تاب «عام»
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label>إيميل الأدمن (المستلم)</Label>
              <Input
                type="email"
                dir="ltr"
                className="text-left"
                placeholder="admin@example.com"
                value={smtp.admin_email}
                onChange={(e) =>
                  setSmtp({ ...smtp, admin_email: e.target.value })
                }
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button
                disabled={pending}
                className="gap-2"
                onClick={() => {
                  startTransition(async () => {
                    const res = await updateSmtpSettingsAction({
                      ...smtp,
                      keep_password:
                        !smtp.smtp_password.trim() && hasSmtpPass,
                    });
                    if (!res.ok) toast.error(res.error);
                    else {
                      toast.success("تم حفظ إعدادات SMTP");
                      router.refresh();
                    }
                  });
                }}
              >
                <Save className="h-4 w-4" />
                حفظ SMTP
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                className="gap-2"
                onClick={() => {
                  startTransition(async () => {
                    const res = await testSmtpAction();
                    if (!res.ok) toast.error(res.error ?? "فشل الاختبار");
                    else toast.success("تم إرسال إيميل الاختبار للأدمن");
                  });
                }}
              >
                <Mail className="h-4 w-4" />
                إرسال اختبار
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
