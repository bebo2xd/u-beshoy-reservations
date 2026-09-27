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

export function hourLabel(hour: number): string {
  if (hour === 0) return "12 ص";
  if (hour < 12) return `${hour} ص`;
  if (hour === 12) return "12 م";
  return `${hour - 12} م`;
}

export function rangeLabel(start: number, end: number): string {
  return `${hourLabel(start)} – ${hourLabel(end)}`;
}
