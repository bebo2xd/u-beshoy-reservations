import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Noto_Sans_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import { OneSignalBootstrap } from "@/components/native/OneSignalBootstrap";
import "./globals.css";

const arabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const display = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic"],
  weight: ["500", "600", "700"],
});

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${arabic.variable} ${display.variable} h-full antialiased`}
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
