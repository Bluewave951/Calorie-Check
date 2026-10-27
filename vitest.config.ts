import { defineConfig } from "vitest/config";

export default defineConfig({
  // ให้ test ใช้ alias "@/..." จาก tsconfig ได้เหมือนโค้ดแอป
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
