import { describe, it, expect, vi } from "vitest";
import { CreateSprint } from "./CreateSprint";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { SprintRepository } from "../ports/SprintRepository";
import type { Sprint } from "../../domain";

class FakeSprintRepo implements SprintRepository {
  sprints = new Map<string, Sprint>();
  membership = new Map<string, Set<string>>();

  async save(sprint: Sprint): Promise<void> {
    this.sprints.set(sprint.id, sprint);
  }
  async findById(id: string): Promise<Sprint | null> {
    return this.sprints.get(id) ?? null;
  }
  async listByWorkspace(workspaceId: string): Promise<Sprint[]> {
    return [...this.sprints.values()].filter((s) => s.workspaceId === workspaceId);
  }
  async findActiveByWorkspace(workspaceId: string): Promise<Sprint | null> {
    for (const s of this.sprints.values()) {
      if (s.workspaceId === workspaceId && s.status === "active") return s;
    }
    return null;
  }
  async addIssue(sprintId: string, issueId: string): Promise<void> {
    const set = this.membership.get(sprintId) ?? new Set<string>();
    set.add(issueId);
    this.membership.set(sprintId, set);
  }
  async removeIssue(sprintId: string, issueId: string): Promise<void> {
    this.membership.get(sprintId)?.delete(issueId);
  }
  async listIssueIds(sprintId: string): Promise<string[]> {
    return [...(this.membership.get(sprintId) ?? new Set<string>())];
  }
}

describe("CreateSprint", () => {
  const now = new Date("2026-06-07T10:00:00Z");
  const workspaceId = "wsp_0001";

  const setup = () => {
    const repo = new FakeSprintRepo();
    const clock = new FrozenClock(now);
    const ids = new SequentialIdGenerator();
    const events = new InMemoryEventBus();
    const useCase = new CreateSprint({ repo, clock, ids, events });
    return { repo, clock, ids, events, useCase };
  };

  const validInput = () => ({
    workspaceId,
    name: "Sprint 1",
    startDate: new Date("2026-06-08T00:00:00Z"),
    endDate: new Date("2026-06-22T00:00:00Z"),
    capacity: 20,
  });

  it("creates a planned sprint and persists it", async () => {
    const { repo, useCase } = setup();
    const r = await useCase.execute(validInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sprint.name).toBe("Sprint 1");
    expect(r.value.sprint.status).toBe("planned");
    expect(r.value.sprint.workspaceId).toBe(workspaceId);
    expect(repo.sprints.size).toBe(1);
  });

  it("publishes SprintCreated event", async () => {
    const { events, useCase } = setup();
    const handler = vi.fn(async (_event: unknown): Promise<void> => undefined);
    events.subscribe("sprint.created", handler);
    await useCase.execute(validInput());
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sprint.created",
        payload: expect.objectContaining({ workspaceId, name: "Sprint 1" }),
      }),
    );
  });

  it("rejects invalid date window with ValidationError", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({
      ...validInput(),
      startDate: new Date("2026-06-22T00:00:00Z"),
      endDate: new Date("2026-06-08T00:00:00Z"),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("rejects negative capacity with ValidationError", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({ ...validInput(), capacity: -5 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });
});
