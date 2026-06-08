import { describe, it, expect } from "vitest";
import { DeleteComment } from "./DeleteComment";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { CommentRepository } from "../ports/CommentRepository";
import { Comment } from "../../domain";
import { unwrap } from "@/shared/result";

class FakeRepo implements CommentRepository {
  byId: Comment | null = null;
  deleted: string[] = [];
  async save(): Promise<void> {}
  async findById(): Promise<Comment | null> {
    return this.byId;
  }
  async listByIssue(): Promise<Comment[]> {
    return [];
  }
  async delete(id: string): Promise<void> {
    this.deleted.push(id);
  }
}

const author = "00000000-0000-0000-0000-000000000050";
const stranger = "00000000-0000-0000-0000-000000000099";

const makeComment = () =>
  unwrap(
    Comment.create({
      id: "cmt_1",
      issueId: "iss_1",
      authorId: author,
      body: "Looks good",
      createdAt: new Date("2026-06-07T10:00:00Z"),
      updatedAt: new Date("2026-06-07T10:00:00Z"),
    }),
  );

describe("DeleteComment", () => {
  const setup = (c: Comment | null) => {
    const repo = new FakeRepo();
    repo.byId = c;
    const events = new InMemoryEventBus();
    const useCase = new DeleteComment({
      repo,
      clock: new FrozenClock("2026-06-07T12:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { repo, events, useCase };
  };

  it("author can delete", async () => {
    const { useCase, repo } = setup(makeComment());
    const r = await useCase.execute({ actorId: author, commentId: "cmt_1" });
    expect(r.ok).toBe(true);
    expect(repo.deleted).toEqual(["cmt_1"]);
  });

  it("non-author gets ForbiddenError", async () => {
    const { useCase, repo } = setup(makeComment());
    const r = await useCase.execute({ actorId: stranger, commentId: "cmt_1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
    expect(repo.deleted).toEqual([]);
  });

  it("unknown comment returns NotFoundError", async () => {
    const { useCase } = setup(null);
    const r = await useCase.execute({ actorId: author, commentId: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("publishes comment.deleted event", async () => {
    const { useCase, events } = setup(makeComment());
    const seen: unknown[] = [];
    events.subscribe("comment.deleted", async (e) => {
      seen.push(e);
    });
    await useCase.execute({ actorId: author, commentId: "cmt_1" });
    expect(seen).toHaveLength(1);
  });
});
