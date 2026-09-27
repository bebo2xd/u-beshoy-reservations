"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  QrCode,
  RefreshCw,
  Save,
  Settings2,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import type { AppSettings } from "@/lib/types";
import type { NotificationPrefs } from "@/lib/notify/prefs";
import { mergeNotificationPrefs } from "@/lib/notify/prefs";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SettingsFormProps = {
  settings: AppSettings & {
    has_evolution_api_key?: boolean;
    has_smtp_password?: boolean;
    channel_status?: {
      telegram: boolean;
      email: boolean;
      evolution_env_fallback: boolean;
    };
  };
};

const NOTIFY_TOGGLES: {
  key: keyof NotificationPrefs;
  label: string;
  hint: string;
}[] = [
  {
    key: "new_booking_telegram",
    label: "طلب جديد → تيليجرام (أدمن)",
    hint: "رسالة مع أزرار موافقة/رفض",
  },
  {
    key: "new_booking_email",
    label: "طلب جديد → إيميل (أدمن)",
    hint: "يتطلب إعداد SMTP من تاب الإيميل",
  },
  {
    key: "new_booking_whatsapp_admin",
    label: "طلب جديد → واتساب أدمن",
    hint: "يرسل لرقم الأدمن عبر Evolution",
  },
  {
    key: "decision_whatsapp_requester",
    label: "موافقة/رفض → واتساب مقدم الطلب",
    hint: "يبلغ الخادم بنتيجة الطلب",
  },
  {
    key: "decision_whatsapp_admin",
    label: "موافقة/رفض → واتساب أدمن",
    hint: "نسخة للأدمن عند البت في الطلب",
  },
  {
    key: "cancel_whatsapp_requester",
    label: "إلغاء طلب → واتساب مقدم الطلب",
    hint: "عند إلغاء الحجز",
  },
  {
    key: "cancel_whatsapp_admin",
    label: "إلغاء طلب → واتساب أدمن",
    hint: "تنبيه الأدمن بالإلغاء",
  },
  {
    key: "admin_booking_whatsapp",
    label: "حجز يدوي من التقويم → واتساب",
    hint: "اختياري للحجوزات اللي بيعملها الأدمن",
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

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [general, setGeneral] = useState({
    site_title: settings.site_title,
    open_hour: settings.open_hour,
    close_hour: settings.close_hour,
    max_weeks_ahead: settings.max_weeks_ahead,
    week_start_day: settings.week_start_day,
    important_notes: settings.important_notes,
  });
  const [prefs, setPrefs] = useState<NotificationPrefs>(
    mergeNotificationPrefs(settings.notification_prefs)
  );
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
        <TabsTrigger value="channels">
          <Smartphone className="h-4 w-4" />
          قنوات أخرى
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card>
          <CardHeader>
            <CardTitle>إعدادات عامة</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>عنوان الموقع</Label>
              <Input
                value={general.site_title}
                onChange={(e) =>
                  setGeneral({ ...general, site_title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>ساعة البداية</Label>
              <Input
                type="number"
                value={general.open_hour}
                onChange={(e) =>
                  setGeneral({ ...general, open_hour: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>ساعة النهاية</Label>
              <Input
                type="number"
                value={general.close_hour}
                onChange={(e) =>
                  setGeneral({ ...general, close_hour: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>أقصى أسابيع للحجز مقدماً</Label>
              <Input
                type="number"
                value={general.max_weeks_ahead}
                onChange={(e) =>
                  setGeneral({
                    ...general,
                    max_weeks_ahead: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>بداية الأسبوع</Label>
              <select
                className="flex h-12 w-full rounded-xl border border-input bg-card px-3.5 text-base"
                value={general.week_start_day}
                onChange={(e) =>
                  setGeneral({
                    ...general,
                    week_start_day: Number(e.target.value),
                  })
                }
              >
                <option value={5}>الجمعة</option>
                <option value={6}>السبت</option>
                <option value={0}>الأحد</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>الملاحظات الهامة</Label>
              <Textarea
                className="min-h-[160px]"
                value={general.important_notes}
                onChange={(e) =>
                  setGeneral({ ...general, important_notes: e.target.value })
                }
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
        <Card>
          <CardHeader>
            <CardTitle>تحكم إشعارات النظام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {NOTIFY_TOGGLES.map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
              >
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm text-sand-11">{item.hint}</p>
                </div>
                <Switch
                  checked={prefs[item.key]}
                  onCheckedChange={(v) =>
                    setPrefs({ ...prefs, [item.key]: v })
                  }
                />
              </label>
            ))}
            <Button
              className="w-full gap-2 sm:w-auto"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const res = await updateNotificationPrefsAction(prefs);
                  if (!res.ok) toast.error(res.error);
                  else toast.success("تم حفظ إعدادات التنبيهات");
                });
              }}
            >
              <Save className="h-4 w-4" />
              حفظ التنبيهات
            </Button>
          </CardContent>
        </Card>
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
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label>اسم الـ Instance</Label>
                <Input
                  dir="ltr"
                  className="text-left"
                  value={evo.evolution_instance}
                  onChange={(e) =>
                    setEvo({ ...evo, evolution_instance: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
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

              <div className="space-y-2 border-t border-border pt-4">
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
            <Badge
              variant={settings.channel_status?.email ? "success" : "muted"}
            >
              {settings.channel_status?.email ? "مضبوط" : "غير مضبوط"}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm text-sand-11">
              إرسال مباشر عبر سيرفر البريد (Gmail / Hostinger / أي SMTP). القيم
              المحفوظة هنا لها أولوية على متغيرات البيئة.
            </p>
            <div className="space-y-2 sm:col-span-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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

      <TabsContent value="channels">
        <Card>
          <CardHeader>
            <CardTitle>حالة القنوات الأخرى</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChannelRow
              title="Telegram"
              ok={Boolean(settings.channel_status?.telegram)}
              hint="TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID في البيئة. الـ webhook: /api/telegram"
            />
            <ChannelRow
              title="Email (SMTP)"
              ok={Boolean(settings.channel_status?.email)}
              hint="اضبط التفاصيل من تاب «إيميل» أو عبر SMTP_* في البيئة"
            />
            <ChannelRow
              title="Evolution (من البيئة كاحتياطي)"
              ok={Boolean(settings.channel_status?.evolution_env_fallback)}
              hint="لو خانات الواتساب فوق فاضية، النظام بيستخدم متغيرات البيئة"
            />
            <p className="pt-2 text-sm text-sand-11">
              تفعيل/إيقاف كل قناة بيتم من تاب «التنبيهات». ربط الواتساب من تاب
              «واتساب»، والإيميل من تاب «إيميل».
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function ChannelRow({
  title,
  ok,
  hint,
}: {
  title: string;
  ok: boolean;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-3">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-sand-11">{hint}</p>
      </div>
      <Badge variant={ok ? "success" : "muted"}>
        {ok ? "جاهز" : "غير مضبوط"}
      </Badge>
    </div>
  );
}
