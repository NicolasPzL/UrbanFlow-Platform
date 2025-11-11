// @ts-ignore: los tipos se resuelven tras instalar @playwright/test
import { defineConfig, devices } from "@playwright/test";

const isCI = !!(globalThis as any).process?.env?.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview",
    cwd: ".",
    port: 4173,
    reuseExistingServer: !isCI,
    timeout: 90_000,
    env: {
      VITE_MAPBOX_ACCESS_TOKEN: "pk.playwright-e2e-token",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

