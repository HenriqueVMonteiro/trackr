// requires: DATABASE_URL (a disposable Postgres/Supabase)
//
// Integração do módulo `webhooks` contra um Postgres real. Os casos pulam
// (it.skip) quando não há DATABASE_URL — ver tests/integration/helpers.ts.
// Os imports são reais, então o arquivo é TYPECHECKADO mesmo quando pulado.

import { describe, expect } from "vitest";
import { SystemClock, NanoidGenerator } from "@/shared";
// O barrel reexporta a entidade só como TYPE (`export type *`); importamos a
// classe direto do domínio para usar WebhookEndpoint.create().
import { WebhookEndpoint } from "@/modules/webhooks/domain/WebhookEndpoint";
import { DrizzleWebhookRepository } from "@/modules/webhooks/infrastructure/DrizzleWebhookRepository";
import { itDb, makeTestDb } from "./helpers";

describe("integration: webhooks repository", () => {
  const clock = new SystemClock();
  const ids = new NanoidGenerator();

  itDb("salva e relê um endpoint (round-trip por id)", async () => {
    const db = makeTestDb();
    const repo = new DrizzleWebhookRepository(db);

    const created = WebhookEndpoint.create({
      id: ids.generate("whk"),
      workspaceId: ids.generate("wsp"),
      url: "https://example.com/hooks/trackr",
      secret: "super-secret-token-1234", // >= 16 chars (invariante de domínio)
      createdAt: clock.now(),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const endpoint = created.value;

    await repo.save(endpoint);
    const found = await repo.findById(endpoint.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(endpoint.id);
    expect(found?.workspaceId).toBe(endpoint.workspaceId);
    expect(found?.url).toBe(endpoint.url);
    expect(found?.signatureAlgo).toBe("hmac-sha256");
    expect(found?.active).toBe(true);
  });

  itDb("findById retorna null para id inexistente", async () => {
    const db = makeTestDb();
    const repo = new DrizzleWebhookRepository(db);

    const found = await repo.findById(ids.generate("whk"));
    expect(found).toBeNull();
  });
});
