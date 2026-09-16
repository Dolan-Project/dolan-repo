import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NEXT_PUBLIC_USE_MOCK_API: "true",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@dolan/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
});
