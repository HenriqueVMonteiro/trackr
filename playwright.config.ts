import { defineConfig, devices } from "@playwright/test";

// Config Playwright para os testes E2E (stint B12).
//
// IMPORTANTE: NÃO há `webServer` aqui — o Playwright NÃO sobe a aplicação. Os
// testes assumem uma instância JÁ RODANDO (e com auth semeada) em baseURL.
// Suba o app antes em outro terminal:
//
//   npm run dev          # ou `npm run build && npm run start`
//   npx playwright install   # uma vez, baixa o Chromium
//   npx playwright test
//
// Mantemos assim de propósito: o E2E precisa do banco/Supabase reais e de um
// usuário semeado, o que não dá para garantir só com `next dev` automático.
export default defineConfig({
  testDir: "./tests/e2e",
  // Falha cedo no CI se alguém deixar um `test.only` esquecido.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Sem `webServer`: a aplicação precisa estar rodando externamente (ver comentário acima).
});
