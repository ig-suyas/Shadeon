import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const local = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": local("./src"),
      "server-only": local("./src/server/__tests__/empty.ts"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    testTimeout: 30_000,
    // Each server test starts its own embedded Postgres; under load that alone can pass 10 s.
    hookTimeout: 30_000,
  },
});
