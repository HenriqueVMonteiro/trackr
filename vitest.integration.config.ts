import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Config separada para os testes de integração (stint B12).
//
// A config principal (vitest.config.ts) EXCLUI `tests/integration/**`, então
// `npm run test` roda apenas os testes unitários (rápidos, sem I/O). Estes aqui
// tocam um Postgres real e por isso rodam num comando dedicado:
//
//   npm run test:integration   (vitest run --config vitest.integration.config.ts)
//
// Sem DATABASE_URL configurado (ver tests/integration/helpers.ts), os casos
// pulam de forma limpa (it.skip) em vez de falhar.
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/integration/**/*.test.ts"],
    // Round-trips contra um banco remoto (Supabase pooler) podem ser lentos
    // no cold start; damos folga generosa.
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
