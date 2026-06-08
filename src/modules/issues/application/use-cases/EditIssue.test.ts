import { describe, it, expect } from "vitest";
import { EditIssue } from "./EditIssue";
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
      title: "Original",
      description: "old body",
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

describe("EditIssue", () => {
  const actorId = "00000000-0000-0000-0000-000000000099";

  const setup = (issue: Issue | null) => {
    const repo = new FakeRepo();
    const activityRepo = new FakeActivityRepo();
    repo.byId = issue;
    const events = new InMemoryEventBus();
    const useCase = new EditIssue({
      repo,
      activityRepo,
      clock: new FrozenClock("2026-06-07T11:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { repo, activityRepo, events, useCase };
  };

  it("edits title and records activity", async () => {
    const { useCase, repo, activityRepo } = setup(make());
    const r = await useCase.execute({ actorId, issueId: "iss_001", title: "New title" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.title).toBe("New title");
    expect(repo.saved).toHaveLength(1);
    expect(activityRepo.saved).toHaveLength(1);
    expect(activityRepo.saved[0]?.action).toBe("edited");
  });

  it("edits description with null clears it", async () => {
    const { useCase } = setup(make({ description: "something" }));
    const r = await useCase.execute({ actorId, issueId: "iss_001", description: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.description).toBeNull();
  });

  it("ValidationError on empty title", async () => {
    const { useCase, repo } = setup(make());
    const r = await useCase.execute({ actorId, issueId: "iss_001", title: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
    expect(repo.saved).toHaveLength(0);
  });

  it("no-op when nothing changed", async () => {
    const { useCase, repo, activityRepo } = setup(make());
    const r = await useCase.execute({
      actorId,
      issueId: "iss_001",
      title: "Original",
      description: "old body",
    });
    expect(r.ok).toBe(true);
    expect(repo.saved).toHaveLength(0);
    expect(activityRepo.saved).toHaveLength(0);
  });

  it("NotFoundError for unknown issue", async () => {
    const { useCase } = setup(null);
    const r = await useCase.execute({ actorId, issueId: "nope", title: "X" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });
});
