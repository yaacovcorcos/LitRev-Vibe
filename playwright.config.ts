process.env.MOCK_REDIS = process.env.MOCK_REDIS ?? "1";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:0";

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "playwright",
  timeout: 15_000,
  retries: 0,
  use: {
    viewport: { width: 1280, height: 720 },
  },
});
