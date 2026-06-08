import { describe, it, expect } from "vitest";
import { AssignIssue } from "./AssignIssue";
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
      priority: "none",
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

describe("AssignIssue", () => {
  const actorId = "00000000-0000-0000-0000-000000000099";
  const assigneeId = "00000000-0000-0000-0000-000000000050";

  const setup = (issue: Issue | null) => {
    const repo = new FakeRepo();
    const activityRepo = new FakeActivityRepo();
    repo.byId = issue;
    const events = new InMemoryEventBus();
    const useCase = new AssignIssue({
      repo,
      activityRepo,
      clock: new FrozenClock("2026-06-07T11:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { repo, activityRepo, events, useCase };
  };

  it("assigns and persists snapshot", async () => {
    const { useCase, repo, activityRepo } = setup(make());
    const r = await useCase.execute({ actorId, issueId: "iss_001", assigneeId });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.assigneeId).toBe(assigneeId);
    expect(repo.saved).toHaveLength(1);
    expect(activityRepo.saved).toHaveLength(1);
    expect(activityRepo.saved[0]?.action).toBe("assigned");
  });

  it("no-op when assignee unchanged", async () => {
    const { useCase, repo, activityRepo } = setup(make({ assigneeId }));
    const r = await useCase.execute({ actorId, issueId: "iss_001", assigneeId });
    expect(r.ok).toBe(true);
    expect(repo.saved).toHaveLength(0);
    expect(activityRepo.saved).toHaveLength(0);
  });

  it("clears assignee with null", async () => {
    const { useCase } = setup(make({ assigneeId }));
    const r = await useCase.execute({ actorId, issueId: "iss_001", assigneeId: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.assigneeId).toBeNull();
  });

  it("NotFoundError for unknown issue", async () => {
    const { useCase } = setup(null);
    const r = await useCase.execute({ actorId, issueId: "nope", assigneeId });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });
});
