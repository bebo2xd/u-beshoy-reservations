import type { NextConfig } from "next";

process.env.TZ = process.env.TZ || "Africa/Cairo";

const nextConfig: NextConfig = {
  serverExternalPackages: ["onesignal-cordova-plugin"],
};

export default nextConfig;
