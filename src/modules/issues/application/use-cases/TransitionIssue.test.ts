import { describe, it, expect } from "vitest";
import { TransitionIssue } from "./TransitionIssue";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { IssueRepository } from "../ports/IssueRepository";
import { Issue, type IssueProps } from "../../domain";
import { unwrap } from "@/shared/result";

const makeIssue = (overrides: Partial<IssueProps> = {}) =>
  unwrap(
    Issue.create({
      id: "iss_001",
      projectId: "prj_001",
      number: 1,
      title: "Demo",
      description: null,
      status: "backlog",
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

describe("TransitionIssue", () => {
  const actorId = "00000000-0000-0000-0000-000000000099";

  const setup = (issue: Issue | null) => {
    const repo = new FakeRepo();
    repo.byId = issue;
    const useCase = new TransitionIssue({
      repo,
      clock: new FrozenClock("2026-06-07T11:00:00Z"),
      ids: new SequentialIdGenerator(),
      events: new InMemoryEventBus(),
    });
    return { repo, useCase, events: (useCase as unknown as { deps: { events: InMemoryEventBus } }).deps.events };
  };

  it("backlog -> todo: persists and publishes event", async () => {
    const issue = makeIssue();
    const { useCase, repo } = setup(issue);
    const subjects: unknown[] = [];
    (useCase as unknown as { deps: { events: InMemoryEventBus } }).deps.events.subscribe(
      "issue.transitioned",
      async (e) => {
        subjects.push(e);
      },
    );
    const r = await useCase.execute({ actorId, issueId: "iss_001", to: "todo" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe("todo");
    expect(repo.saved).toHaveLength(1);
    expect(subjects).toHaveLength(1);
  });

  it("rejects invalid transition with InvalidTransitionError", async () => {
    const issue = makeIssue({ status: "backlog" });
    const { useCase, repo } = setup(issue);
    const r = await useCase.execute({ actorId, issueId: "iss_001", to: "done" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_transition");
    expect(repo.saved).toHaveLength(0);
  });

  it("rejects unknown issue with NotFoundError", async () => {
    const { useCase } = setup(null);
    const r = await useCase.execute({ actorId, issueId: "iss_nope", to: "todo" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("in_review -> done requires approver", async () => {
    const issue = makeIssue({ status: "in_review", approverId: null });
    const { useCase } = setup(issue);
    const r = await useCase.execute({ actorId, issueId: "iss_001", to: "done" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.meta).toMatchObject({ reason: "approver_required" });
  });
});
