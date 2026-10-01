import type { CapacitorConfig } from "@capacitor/cli";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://u-beshoy-reservations.vercel.app";

const config: CapacitorConfig = {
  appId: "xd.church.reservations.app",
  appName: "حجوزات الكنيسة",
  webDir: "www",
  server: {
    url: appUrl,
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#F7F3EB",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#F7F3EB",
    },
  },
};

export default config;
