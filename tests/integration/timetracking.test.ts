// requires: DATABASE_URL (a disposable Postgres/Supabase)
//
// Integração do módulo `timetracking` contra um Postgres real. Os casos pulam
// (it.skip) quando não há DATABASE_URL — ver tests/integration/helpers.ts.
// Os imports são reais, então o arquivo é TYPECHECKADO mesmo quando pulado.

import { describe, expect } from "vitest";
import { SystemClock, NanoidGenerator } from "@/shared";
// O barrel reexporta a entidade só como TYPE (`export type *`); importamos a
// classe direto do domínio para usar TimeEntry.create().
import { TimeEntry } from "@/modules/timetracking/domain/TimeEntry";
import { DrizzleTimeEntryRepository } from "@/modules/timetracking/infrastructure/DrizzleTimeEntryRepository";
import { itDb, makeTestDb } from "./helpers";

describe("integration: timetracking repository", () => {
  const clock = new SystemClock();
  const ids = new NanoidGenerator();

  itDb("salva e relê um time entry (round-trip por id)", async () => {
    const db = makeTestDb();
    const repo = new DrizzleTimeEntryRepository(db);

    const startedAt = clock.now();
    const endedAt = new Date(startedAt.getTime() + 90 * 60 * 1000); // +90 min
    const created = TimeEntry.create({
      id: ids.generate("tme"),
      issueId: ids.generate("iss"),
      userId: ids.generate("usr"),
      startedAt,
      endedAt,
      description: "Sessão de integração",
      createdAt: clock.now(),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const entry = created.value;

    await repo.save(entry);
    const found = await repo.findById(entry.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(entry.id);
    expect(found?.issueId).toBe(entry.issueId);
    expect(found?.userId).toBe(entry.userId);
    expect(found?.durationSeconds).toBe(entry.durationSeconds);
    expect(found?.description).toBe("Sessão de integração");
  });

  itDb("findById retorna null para id inexistente", async () => {
    const db = makeTestDb();
    const repo = new DrizzleTimeEntryRepository(db);

    const found = await repo.findById(ids.generate("tme"));
    expect(found).toBeNull();
  });
});
