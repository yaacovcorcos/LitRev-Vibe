import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "playwright",
  timeout: 15_000,
  retries: 0,
  use: {
    viewport: { width: 1280, height: 720 },
  },
});
