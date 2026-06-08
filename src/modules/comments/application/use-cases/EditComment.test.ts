import { describe, it, expect } from "vitest";
import { EditComment } from "./EditComment";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { CommentRepository } from "../ports/CommentRepository";
import { Comment } from "../../domain";
import { unwrap } from "@/shared/result";

class FakeRepo implements CommentRepository {
  byId: Comment | null = null;
  saved: Comment[] = [];
  async save(c: Comment): Promise<void> {
    this.byId = c;
    this.saved.push(c);
  }
  async findById(): Promise<Comment | null> {
    return this.byId;
  }
  async listByIssue(): Promise<Comment[]> {
    return [];
  }
  async delete(): Promise<void> {}
}

const author = "00000000-0000-0000-0000-000000000050";
const stranger = "00000000-0000-0000-0000-000000000099";

const makeComment = () =>
  unwrap(
    Comment.create({
      id: "cmt_1",
      issueId: "iss_1",
      authorId: author,
      body: "Original",
      createdAt: new Date("2026-06-07T10:00:00Z"),
      updatedAt: new Date("2026-06-07T10:00:00Z"),
    }),
  );

describe("EditComment", () => {
  const setup = (c: Comment | null) => {
    const repo = new FakeRepo();
    repo.byId = c;
    const events = new InMemoryEventBus();
    const useCase = new EditComment({
      repo,
      clock: new FrozenClock("2026-06-07T12:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { repo, events, useCase };
  };

  it("author can edit", async () => {
    const { useCase, repo } = setup(makeComment());
    const r = await useCase.execute({ actorId: author, commentId: "cmt_1", body: "Updated" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.body).toBe("Updated");
    expect(repo.saved).toHaveLength(1);
  });

  it("non-author gets ForbiddenError", async () => {
    const { useCase, repo } = setup(makeComment());
    const r = await useCase.execute({
      actorId: stranger,
      commentId: "cmt_1",
      body: "Hack",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
    expect(repo.saved).toHaveLength(0);
  });

  it("unknown comment returns NotFoundError", async () => {
    const { useCase } = setup(null);
    const r = await useCase.execute({
      actorId: author,
      commentId: "nope",
      body: "X",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("ValidationError on empty body", async () => {
    const { useCase } = setup(makeComment());
    const r = await useCase.execute({ actorId: author, commentId: "cmt_1", body: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });
});
