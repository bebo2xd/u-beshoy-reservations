import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { OneSignalBootstrap } from "@/components/native/OneSignalBootstrap";
import { getSettings } from "@/lib/data";
import { uiFontClassNames } from "@/lib/fonts";
import { resolveUiFont } from "@/lib/ui-fonts";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F0F9FF",
};

export const metadata: Metadata = {
  title: "حجوزات الكنيسة",
  description: "نظام حجز مواعيد غرف مبنى الخدمات الكنسي",
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/logo-64.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/logo-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/logo-192.png", sizes: "192x192" }],
    shortcut: ["/brand/favicon-32.png"],
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const uiFont = resolveUiFont(settings.ui_font);

  return (
    <html
      lang="ar"
      dir="rtl"
      data-ui-font={uiFont}
      className={`${uiFontClassNames} h-full antialiased`}
    >
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <OneSignalBootstrap />
        {children}
        <Toaster position="top-center" dir="rtl" richColors closeButton />
      </body>
    </html>
  );
}
