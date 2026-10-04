export const UI_FONTS = [
  {
    id: "tajawal",
    label: "تجوّال",
    hint: "واضح وهندسي",
    cssVar: "--font-tajawal",
  },
  {
    id: "cairo",
    label: "القاهرة",
    hint: "دافئ ومستدير",
    cssVar: "--font-cairo",
  },
  {
    id: "ibm-plex",
    label: "IBM Plex",
    hint: "رسمي ومرتب",
    cssVar: "--font-ibm-plex",
  },
  {
    id: "almarai",
    label: "المارعي",
    hint: "ناعم وسهل القراءة",
    cssVar: "--font-almarai",
  },
  {
    id: "readex",
    label: "Readex Pro",
    hint: "حديث للواجهات",
    cssVar: "--font-readex",
  },
  {
    id: "el-messiri",
    label: "المسيري",
    hint: "أقرب للطابع الكنسي",
    cssVar: "--font-el-messiri",
  },
] as const;

export type UiFontId = (typeof UI_FONTS)[number]["id"];

export const DEFAULT_UI_FONT: UiFontId = "tajawal";

export function isUiFontId(value: unknown): value is UiFontId {
  return UI_FONTS.some((font) => font.id === value);
}

export function resolveUiFont(value: unknown): UiFontId {
  return isUiFontId(value) ? value : DEFAULT_UI_FONT;
}
