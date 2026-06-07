import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    exclude: ["node_modules", "tests/integration/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Coverage focuses on unit-testable code: pure domain + shared primitives.
      // application/use-cases and infrastructure are covered by integration
      // tests (run via `npm run test:integration`, planned in stint B12).
      include: ["src/modules/*/domain/**/*.ts", "src/shared/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/index.ts",
        "src/**/events.ts",
        "src/shared/**/Outbox.ts",
        "src/shared/events/domain-event.ts",
      ],
      thresholds: {
        lines: 80,
        // Many getters on immutable entities are exercised indirectly through
        // behavior tests rather than called in isolation; we keep functions
        // intentionally a bit lower than lines.
        functions: 70,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
