import { defineConfig } from "@playwright/test";

/**
 * Screen-size test (e2e/screen-sizes.spec.ts). Runs the built app against
 * a fake Supabase (e2e/fake-supabase.mjs), so it needs a build made with
 * NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 first:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=fake npm run build
 *   npm run test:screens
 *
 * Add NEXT_PUBLIC_CLUB=film to the build to test the movie club's texts.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
  },
  webServer: [
    {
      command: "node e2e/fake-supabase.mjs",
      url: "http://localhost:54321/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/login`,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake",
      },
    },
  ],
});
