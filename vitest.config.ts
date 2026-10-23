import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL(
          "./node_modules/next/dist/compiled/server-only/empty.js",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    // Database tests run embedded PostgreSQL/WASM; bound memory on small CI hosts.
    maxWorkers: 1,
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
