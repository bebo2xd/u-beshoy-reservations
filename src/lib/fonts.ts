import {
  Almarai,
  Cairo,
  El_Messiri,
  IBM_Plex_Sans_Arabic,
  Readex_Pro,
  Tajawal,
} from "next/font/google";
import type { UiFontId } from "@/lib/ui-fonts";

export const fontTajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
});

export const fontCairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const fontIbmPlex = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const fontAlmarai = Almarai({
  variable: "--font-almarai",
  subsets: ["arabic", "latin"],
  weight: ["400", "700", "800"],
});

export const fontReadex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const fontElMessiri = El_Messiri({
  variable: "--font-el-messiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const uiFontClassNames = [
  fontTajawal.variable,
  fontCairo.variable,
  fontIbmPlex.variable,
  fontAlmarai.variable,
  fontReadex.variable,
  fontElMessiri.variable,
].join(" ");

export const uiFontVariableClass: Record<UiFontId, string> = {
  tajawal: fontTajawal.variable,
  cairo: fontCairo.variable,
  "ibm-plex": fontIbmPlex.variable,
  almarai: fontAlmarai.variable,
  readex: fontReadex.variable,
  "el-messiri": fontElMessiri.variable,
};
