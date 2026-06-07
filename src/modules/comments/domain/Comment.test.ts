import { describe, it, expect } from "vitest";
import { Comment, type CommentProps } from "./Comment";
import { isErr, unwrap } from "@/shared/result";

const props = (overrides: Partial<CommentProps> = {}): CommentProps => ({
  id: "cmt_1",
  issueId: "iss_1",
  authorId: "00000000-0000-0000-0000-000000000001",
  body: "Looks good!",
  createdAt: new Date("2026-06-07T10:00:00Z"),
  updatedAt: new Date("2026-06-07T10:00:00Z"),
  ...overrides,
});

describe("Comment", () => {
  it("trims and validates body", () => {
    const r = Comment.create(props({ body: "  hi  " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.body).toBe("hi");
  });

  it("rejects empty body", () => {
    expect(isErr(Comment.create(props({ body: "   " })))).toBe(true);
  });

  it("rejects body over 10000 chars", () => {
    expect(isErr(Comment.create(props({ body: "x".repeat(10001) })))).toBe(true);
  });

  it("edit returns new instance with new updatedAt", () => {
    const c = unwrap(Comment.create(props()));
    const at = new Date("2026-06-08T00:00:00Z");
    const edited = c.edit("Updated body", at);
    expect(edited.ok).toBe(true);
    if (edited.ok) {
      expect(edited.value.body).toBe("Updated body");
      expect(edited.value.updatedAt.toISOString()).toBe(at.toISOString());
      expect(c.body).toBe("Looks good!");
    }
  });

  it("edit returns same instance when body unchanged", () => {
    const c = unwrap(Comment.create(props()));
    const r = c.edit("Looks good!", new Date());
    if (r.ok) expect(r.value).toBe(c);
  });

  it("canBeEditedBy: author can, others cannot", () => {
    const c = unwrap(Comment.create(props()));
    expect(c.canBeEditedBy("00000000-0000-0000-0000-000000000001")).toBe(true);
    expect(c.canBeEditedBy("00000000-0000-0000-0000-000000000002")).toBe(false);
  });
});
