import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.a11y.test.tsx"],
    environment: "node",
    setupFiles: ["vitest.setup.ts"],
    environmentMatchGlobs: [
      ["src/**/*.a11y.test.tsx", "jsdom"],
      ["src/**/*.test.tsx", "jsdom"],
    ],
  },
});
