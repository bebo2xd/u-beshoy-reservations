import type { AppRole } from "@/lib/types";

export const PERMISSIONS = [
  {
    key: "access_admin",
    label: "دخول لوحة التحكم",
    description: "يشوف القائمة الجانبية وصفحات الإدارة",
  },
  {
    key: "book",
    label: "حجز مكان",
    description: "يقدر يطلب حجز من صفحة الحجز",
  },
  {
    key: "view_own_bookings",
    label: "متابعة طلباتي",
    description: "يشوف ويُلغي طلباته",
  },
  {
    key: "decide_bookings",
    label: "موافقة / رفض الطلبات",
    description: "يبت في طلبات الحجز المعلقة",
  },
  {
    key: "manage_calendar",
    label: "التقويم والحجز اليدوي",
    description: "إضافة حجوزات واستثناءات من التقويم",
  },
  {
    key: "manage_rooms",
    label: "إدارة الأماكن",
    description: "إضافة وتعديل وترتيب الأماكن",
  },
  {
    key: "manage_schedules",
    label: "المواعيد الثابتة",
    description: "إدارة الجدول الأسبوعي الثابت",
  },
  {
    key: "manage_blackouts",
    label: "الأوقات المقفولة",
    description: "قفل أوقات واجتماع الخدام",
  },
  {
    key: "manage_servants",
    label: "إدارة الخدام",
    description: "إنشاء وتعديل حسابات الخدام",
  },
  {
    key: "manage_settings",
    label: "الإعدادات",
    description: "ساعات العمل والملاحظات",
  },
  {
    key: "manage_permissions",
    label: "إدارة الصلاحيات",
    description: "تعديل صلاحيات الأدوار والصلاحيات الخاصة",
  },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  admin: [...PERMISSION_KEYS],
  servant: ["book", "view_own_bookings"],
};

export const CUSTOM_FLAG = "__custom__";

export function permissionLabel(key: string) {
  return PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}
