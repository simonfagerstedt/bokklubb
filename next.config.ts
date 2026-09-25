import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Enable Cloudflare bindings (env vars, KV, R2, etc.) when running `next dev`.
// Has no effect in production - the Cloudflare adapter handles that at build/deploy time.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
