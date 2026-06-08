import { describe, it, expect } from "vitest";
import { DeleteIssue } from "./DeleteIssue";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import { Issue, type IssueProps } from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";
import { unwrap } from "@/shared/result";

const make = (overrides: Partial<IssueProps> = {}) =>
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
  deleted: string[] = [];
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
  async save(): Promise<void> {}
  async delete(id: string): Promise<void> {
    this.deleted.push(id);
  }
  async attachLabel(): Promise<void> {}
  async detachLabel(): Promise<void> {}
  async listLabelIds(): Promise<string[]> {
    return [];
  }
}

describe("DeleteIssue", () => {
  const creator = "00000000-0000-0000-0000-000000000001";
  const stranger = "00000000-0000-0000-0000-000000000099";

  const setup = (issue: Issue | null) => {
    const repo = new FakeRepo();
    repo.byId = issue;
    const events = new InMemoryEventBus();
    const useCase = new DeleteIssue({
      repo,
      clock: new FrozenClock("2026-06-07T12:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { repo, events, useCase };
  };

  it("creator can delete", async () => {
    const { useCase, repo } = setup(make({ createdBy: creator }));
    const r = await useCase.execute({ actorId: creator, issueId: "iss_001" });
    expect(r.ok).toBe(true);
    expect(repo.deleted).toEqual(["iss_001"]);
  });

  it("non-creator gets ForbiddenError", async () => {
    const { useCase, repo } = setup(make({ createdBy: creator }));
    const r = await useCase.execute({ actorId: stranger, issueId: "iss_001" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
    expect(repo.deleted).toEqual([]);
  });

  it("unknown issue gets NotFoundError", async () => {
    const { useCase } = setup(null);
    const r = await useCase.execute({ actorId: creator, issueId: "iss_nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("publishes IssueDeleted event on success", async () => {
    const { useCase, events } = setup(make({ createdBy: creator }));
    const seen: unknown[] = [];
    events.subscribe("issue.deleted", async (e) => {
      seen.push(e);
    });
    await useCase.execute({ actorId: creator, issueId: "iss_001" });
    expect(seen).toHaveLength(1);
  });
});
