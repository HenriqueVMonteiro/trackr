import { describe, it, expect } from "vitest";
import { SetPriority } from "./SetPriority";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import { Issue, type IssueProps } from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";
import type { ActivityRepository } from "../ports/ActivityRepository";
import type { ActivitySnapshot } from "../../domain/ActivitySnapshot";
import { unwrap } from "@/shared/result";

const make = (overrides: Partial<IssueProps> = {}) =>
  unwrap(
    Issue.create({
      id: "iss_001",
      projectId: "prj_001",
      number: 1,
      title: "Demo",
      description: null,
      status: "todo",
      priority: "low",
      assigneeId: null,
      approverId: null,
      parentId: null,
      createdBy: "00000000-0000-0000-0000-000000000001",
      createdAt: new Date("2026-06-07T10:00:00Z"),
      updatedAt: new Date("2026-06-07T10:00:00Z"),
      closedAt: null,
      canceledAt: null,
      ...overrides,
    }),
  );

class FakeRepo implements IssueRepository {
  byId: Issue | null = null;
  saved: Issue[] = [];
  async findById(): Promise<Issue | null> {
    return this.byId;
  }
  async findByProjectAndNumber(): Promise<Issue | null> {
    return null;
  }
  async listByProject() {
    return { items: [], nextCursor: null };
  }
  async listChildren(): Promise<Issue[]> {
    return [];
  }
  async save(issue: Issue): Promise<void> {
    this.byId = issue;
    this.saved.push(issue);
  }
  async delete(): Promise<void> {}
  async attachLabel(): Promise<void> {}
  async detachLabel(): Promise<void> {}
  async listLabelIds(): Promise<string[]> {
    return [];
  }
}

class FakeActivityRepo implements ActivityRepository {
  saved: ActivitySnapshot[] = [];
  async save(s: ActivitySnapshot): Promise<void> {
    this.saved.push(s);
  }
  async listByIssue(): Promise<ActivitySnapshot[]> {
    return [...this.saved];
  }
}

describe("SetPriority", () => {
  const actorId = "00000000-0000-0000-0000-000000000099";

  const setup = (issue: Issue | null) => {
    const repo = new FakeRepo();
    const activityRepo = new FakeActivityRepo();
    repo.byId = issue;
    const events = new InMemoryEventBus();
    const useCase = new SetPriority({
      repo,
      activityRepo,
      clock: new FrozenClock("2026-06-07T11:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { repo, activityRepo, events, useCase };
  };

  it("changes priority and records activity with diff", async () => {
    const { useCase, repo, activityRepo } = setup(make({ priority: "low" }));
    const r = await useCase.execute({ actorId, issueId: "iss_001", priority: "urgent" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.priority).toBe("urgent");
    expect(repo.saved).toHaveLength(1);
    expect(activityRepo.saved).toHaveLength(1);
    const snap = activityRepo.saved[0];
    expect(snap?.action).toBe("priority_changed");
    expect(snap?.diff.fields["priority"]).toEqual({ from: "low", to: "urgent" });
  });

  it("no-op when priority unchanged", async () => {
    const { useCase, repo, activityRepo } = setup(make({ priority: "low" }));
    const r = await useCase.execute({ actorId, issueId: "iss_001", priority: "low" });
    expect(r.ok).toBe(true);
    expect(repo.saved).toHaveLength(0);
    expect(activityRepo.saved).toHaveLength(0);
  });

  it("NotFoundError for unknown issue", async () => {
    const { useCase } = setup(null);
    const r = await useCase.execute({ actorId, issueId: "nope", priority: "high" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("publishes IssuePriorityChanged event", async () => {
    const { useCase, events } = setup(make({ priority: "medium" }));
    const seen: unknown[] = [];
    events.subscribe("issue.priority_changed", async (e) => {
      seen.push(e);
    });
    await useCase.execute({ actorId, issueId: "iss_001", priority: "urgent" });
    expect(seen).toHaveLength(1);
  });
});
