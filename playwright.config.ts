process.env.MOCK_REDIS = process.env.MOCK_REDIS ?? "1";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:0";

import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const HOST = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: "playwright",
  timeout: 20_000,
  retries: 0,
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --hostname ${HOST} --port ${PORT}`,
    cwd: ".",
    port: PORT,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
