export const DAY_NAMES_AR: Record<number, string> = {
  0: "الأحد",
  1: "الإثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

export const DAY_SHORT_AR: Record<number, string> = {
  0: "أحد",
  1: "إثنين",
  2: "ثلاثاء",
  3: "أربعاء",
  4: "خميس",
  5: "جمعة",
  6: "سبت",
};

/** Week order: Friday → Thursday */
export const WEEK_ORDER = [5, 6, 0, 1, 2, 3, 4] as const;

export const DEFAULT_OPEN_HOUR = 11;
export const DEFAULT_CLOSE_HOUR = 21;
export const DEFAULT_SLOT_DURATION_MINUTES = 60 as const;

export const ROOM_COLORS = [
  "#12A594", // teal
  "#3E63DD", // indigo
  "#E54D2E", // tomato
  "#AB4ABA", // plum
  "#F76B15", // orange
  "#30A46C", // green
  "#0090FF", // blue
  "#E93D82", // pink
  "#8E4EC6", // violet
  "#AD7F58", // bronze
  "#946A00", // gold
  "#0D9B8A", // teal-10
  "#5B5BD6", // iris
] as const;

export const DEFAULT_IMPORTANT_NOTES = `1. اجتماع الخدام الشهري: يوم الثلاثاء المحدد من الإدارة تتوقف كل الخدمات من الساعة 7 مساءً.
2. الفصول تُفتح فقط بحضور المسؤولين (مجدي / إبراهيم / ميلاد). تسليم المفاتيح ممنوع نهائياً.
3. لا يُسمح بتغيير المواعيد المتفق عليها دون الرجوع للمسؤولين لتفادي التداخل.
4. التواصل بخصوص استخدام الأماكن يتم فقط عبر أمين الخدمة أو مساعده.
5. يُغلق التكييف والمراوح بعد كل خدمة بواسطة المسؤول والخدام الحاضرين.`;

/** Normalize float hour (avoid 11.499999) */
export function normalizeHour(hour: number): number {
  return Math.round(hour * 2) / 2;
}

export function slotStepHours(
  slotDurationMinutes: number = DEFAULT_SLOT_DURATION_MINUTES
): number {
  return slotDurationMinutes / 60;
}

export function hourLabel(hour: number): string {
  const h = normalizeHour(hour);
  if (h === 24 || h === 0) return "12 ص";
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  const suffix = whole < 12 || whole === 24 ? "ص" : "م";
  let display = whole % 12;
  if (display === 0) display = 12;
  if (mins === 0) return `${display} ${suffix}`;
  return `${display}:${String(mins).padStart(2, "0")} ${suffix}`;
}

export function rangeLabel(start: number, end: number): string {
  return `${hourLabel(start)} – ${hourLabel(end)}`;
}

/** HH:MM:SS for a fractional hour */
export function hourToClock(hour: number): string {
  const h = normalizeHour(hour);
  const whole = Math.floor(h) % 24;
  const mins = Math.round((h - Math.floor(h)) * 60);
  return `${String(whole).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
}

