import { describe, it, expect, vi } from "vitest";
import { LogTime } from "./LogTime";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { TimeEntryRepository } from "../ports/TimeEntryRepository";
import type { TimeEntry } from "../../domain";

class FakeRepo implements TimeEntryRepository {
  entries = new Map<string, TimeEntry>();

  async save(entry: TimeEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }
  async findById(id: string): Promise<TimeEntry | null> {
    return this.entries.get(id) ?? null;
  }
  async delete(id: string): Promise<void> {
    this.entries.delete(id);
  }
  async listByIssue(issueId: string): Promise<TimeEntry[]> {
    return [...this.entries.values()].filter((e) => e.issueId === issueId);
  }
  async listByUser(userId: string): Promise<TimeEntry[]> {
    return [...this.entries.values()].filter((e) => e.userId === userId);
  }
}

describe("LogTime", () => {
  const now = new Date("2026-06-07T12:00:00Z");
  const userId = "00000000-0000-0000-0000-000000000001";
  const issueId = "iss_0001";

  const setup = () => {
    const repo = new FakeRepo();
    const clock = new FrozenClock(now);
    const ids = new SequentialIdGenerator();
    const events = new InMemoryEventBus();
    const useCase = new LogTime({ repo, clock, ids, events });
    return { repo, clock, ids, events, useCase };
  };

  it("logs a time entry and persists it with a derived duration", async () => {
    const { repo, useCase } = setup();
    const r = await useCase.execute({
      issueId,
      userId,
      startedAt: new Date("2026-06-07T10:00:00Z"),
      endedAt: new Date("2026-06-07T11:30:00Z"),
      description: "Implementing the report",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.entry.durationSeconds).toBe(5400);
    expect(r.value.entry.id).toBe("tme_0001");
    expect(repo.entries.size).toBe(1);
  });

  it("publishes a TimeLogged event", async () => {
    const { events, useCase } = setup();
    const handler = vi.fn(async (_event: unknown): Promise<void> => undefined);
    events.subscribe("timetracking.logged", handler);
    await useCase.execute({
      issueId,
      userId,
      startedAt: new Date("2026-06-07T10:00:00Z"),
      endedAt: new Date("2026-06-07T11:00:00Z"),
      description: null,
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "timetracking.logged",
        payload: expect.objectContaining({ issueId, userId, durationSeconds: 3600 }),
      }),
    );
  });

  it("rejects an interval where endedAt is not after startedAt", async () => {
    const { repo, useCase } = setup();
    const r = await useCase.execute({
      issueId,
      userId,
      startedAt: new Date("2026-06-07T11:00:00Z"),
      endedAt: new Date("2026-06-07T10:00:00Z"),
      description: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
    expect(repo.entries.size).toBe(0);
  });
});
