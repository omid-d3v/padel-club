import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command: "node tests/browser/backend.mjs",
      url: "http://127.0.0.1:54321/health",
      reuseExistingServer: false,
    },
    {
      command:
        "npm run build && npm run start -- --port 3100 --hostname 127.0.0.1",
      url: "http://127.0.0.1:3100/login",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "sb_publishable_browser_test_only",
      },
    },
  ],
});
