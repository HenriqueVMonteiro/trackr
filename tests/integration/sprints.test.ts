// requires: DATABASE_URL (a disposable Postgres/Supabase)
//
// Integração do módulo `sprints` contra um Postgres real. Os casos pulam
// (it.skip) quando não há DATABASE_URL — ver tests/integration/helpers.ts.
// Os imports são reais, então o arquivo é TYPECHECKADO mesmo quando pulado.

import { describe, expect } from "vitest";
import { SystemClock, NanoidGenerator } from "@/shared";
// O barrel do módulo reexporta a entidade apenas como TYPE (`export type *`),
// então importamos a classe direto do domínio para poder usar Sprint.create().
import { Sprint } from "@/modules/sprints/domain/Sprint";
import { DrizzleSprintRepository } from "@/modules/sprints/infrastructure/DrizzleSprintRepository";
import { itDb, makeTestDb } from "./helpers";

describe("integration: sprints repository", () => {
  const clock = new SystemClock();
  const ids = new NanoidGenerator();

  itDb("salva e relê uma sprint (round-trip por id)", async () => {
    const db = makeTestDb();
    const repo = new DrizzleSprintRepository(db);

    const now = clock.now();
    const created = Sprint.create({
      id: ids.generate("spr"),
      workspaceId: ids.generate("wsp"),
      name: "Sprint de integração",
      startDate: now,
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      capacity: 40,
      createdAt: now,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const sprint = created.value;

    await repo.save(sprint);
    const found = await repo.findById(sprint.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(sprint.id);
    expect(found?.name).toBe(sprint.name);
    expect(found?.workspaceId).toBe(sprint.workspaceId);
    expect(found?.status).toBe("planned");
    expect(found?.capacity).toBe(40);
  });

  itDb("findById retorna null para id inexistente", async () => {
    const db = makeTestDb();
    const repo = new DrizzleSprintRepository(db);

    const found = await repo.findById(ids.generate("spr"));
    expect(found).toBeNull();
  });
});
