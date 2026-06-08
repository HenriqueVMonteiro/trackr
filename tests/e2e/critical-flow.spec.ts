// requires: a running app + seeded auth + `npx playwright install`
//
// Fluxo crítico fim-a-fim do Trackr (stint B12):
//   login -> criar workspace -> criar projeto -> criar issue ->
//   transicionar a issue backlog -> todo -> doing -> review -> done ->
//   verificar que o activity log (Memento) registrou as transições.
//
// Este spec documenta o fluxo pretendido com seletores acessíveis
// (getByRole / getByLabel). Ele assume:
//   1. a aplicação rodando em baseURL (ver playwright.config.ts — sem webServer);
//   2. um usuário de teste já semeado no Supabase Auth;
//   3. `npx playwright install` executado ao menos uma vez (Chromium).
//
// Os passos abaixo refletem a UI alvo; ajuste os labels conforme a interface
// real for sendo construída. O arquivo TYPECHECKA contra @playwright/test.

import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_USER_EMAIL ?? "e2e@trackr.local";
const TEST_PASSWORD = process.env.E2E_USER_PASSWORD ?? "e2e-password";

test.describe("fluxo crítico: workspace -> projeto -> issue -> ciclo de vida", () => {
  test("usuário cria estrutura e move uma issue até 'done', com activity log", async ({
    page,
  }) => {
    // 1. Login (auth semeada — Supabase Auth).
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(TEST_EMAIL);
    await page.getByLabel(/senha|password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /entrar|sign in|login/i }).click();
    await expect(page).toHaveURL(/\/(workspaces|dashboard)?/);

    // 2. Criar workspace.
    await page.getByRole("button", { name: /nov[oa] workspace|new workspace/i }).click();
    const workspaceName = `WS E2E ${Date.now()}`;
    await page.getByLabel(/nome|name/i).fill(workspaceName);
    await page.getByRole("button", { name: /criar|create/i }).click();
    await expect(page.getByRole("heading", { name: workspaceName })).toBeVisible();

    // 3. Criar projeto.
    await page.getByRole("button", { name: /nov[oa] projeto|new project/i }).click();
    const projectName = `Projeto E2E ${Date.now()}`;
    await page.getByLabel(/nome|name/i).fill(projectName);
    await page.getByRole("button", { name: /criar|create/i }).click();
    await expect(page.getByRole("link", { name: projectName })).toBeVisible();
    await page.getByRole("link", { name: projectName }).click();

    // 4. Criar issue.
    await page.getByRole("button", { name: /nova issue|new issue/i }).click();
    const issueTitle = `Issue E2E ${Date.now()}`;
    await page.getByLabel(/título|title/i).fill(issueTitle);
    await page.getByRole("button", { name: /criar|create/i }).click();
    await expect(page.getByRole("link", { name: issueTitle })).toBeVisible();
    await page.getByRole("link", { name: issueTitle }).click();

    // 5. Transicionar pela state machine: backlog -> todo -> doing -> review -> done.
    const transitions = ["todo", "doing", "review", "done"] as const;
    for (const next of transitions) {
      await page.getByRole("button", { name: new RegExp(next, "i") }).click();
      await expect(page.getByRole("status")).toContainText(new RegExp(next, "i"));
    }

    // 6. Verificar o activity log (Memento) registrou as transições.
    await page.getByRole("tab", { name: /atividade|activity/i }).click();
    const activity = page.getByRole("list", { name: /atividade|activity/i });
    for (const next of transitions) {
      await expect(activity).toContainText(new RegExp(next, "i"));
    }
  });
});
