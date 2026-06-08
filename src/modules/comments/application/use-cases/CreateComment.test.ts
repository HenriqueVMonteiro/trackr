import { describe, it, expect } from "vitest";
import { CreateComment } from "./CreateComment";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { CommentRepository } from "../ports/CommentRepository";
import type { IssueRepository } from "@/modules/issues/application/ports/IssueRepository";
import { Issue, type IssueProps } from "@/modules/issues/domain";
import type { Comment } from "../../domain";
import { unwrap } from "@/shared/result";

class FakeCommentRepo implements CommentRepository {
  saved: Comment[] = [];
  async save(c: Comment): Promise<void> {
    this.saved.push(c);
  }
  async findById(): Promise<Comment | null> {
    return null;
  }
  async listByIssue(): Promise<Comment[]> {
    return [];
  }
  async delete(): Promise<void> {}
}

class FakeIssueRepo implements IssueRepository {
  byId: Issue | null = null;
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
  async delete(): Promise<void> {}
  async attachLabel(): Promise<void> {}
  async detachLabel(): Promise<void> {}
  async listLabelIds(): Promise<string[]> {
    return [];
  }
}

const makeIssue = (overrides: Partial<IssueProps> = {}) =>
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

describe("CreateComment", () => {
  const author = "00000000-0000-0000-0000-000000000050";

  const setup = (issue: Issue | null = makeIssue()) => {
    const commentRepo = new FakeCommentRepo();
    const issueRepo = new FakeIssueRepo();
    issueRepo.byId = issue;
    const events = new InMemoryEventBus();
    const useCase = new CreateComment({
      commentRepo,
      issueRepo,
      clock: new FrozenClock("2026-06-07T12:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { commentRepo, issueRepo, events, useCase };
  };

  it("creates a comment and persists it", async () => {
    const { useCase, commentRepo } = setup();
    const r = await useCase.execute({ actorId: author, issueId: "iss_001", body: "Looks good" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.body).toBe("Looks good");
      expect(r.value.authorId).toBe(author);
    }
    expect(commentRepo.saved).toHaveLength(1);
  });

  it("NotFoundError when issue does not exist", async () => {
    const { useCase } = setup(null);
    const r = await useCase.execute({ actorId: author, issueId: "iss_nope", body: "Hi" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("ValidationError when body is empty", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({ actorId: author, issueId: "iss_001", body: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("publishes comment.created event", async () => {
    const { useCase, events } = setup();
    const seen: unknown[] = [];
    events.subscribe("comment.created", async (e) => {
      seen.push(e);
    });
    await useCase.execute({ actorId: author, issueId: "iss_001", body: "Hi" });
    expect(seen).toHaveLength(1);
  });
});
