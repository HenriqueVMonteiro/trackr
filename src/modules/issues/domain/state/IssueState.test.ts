import { describe, it, expect } from "vitest";
import {
  BacklogState,
  TodoState,
  InProgressState,
  InReviewState,
  DoneState,
  CanceledState,
  type IssueStateContext,
} from "./IssueState";

const noApprover: IssueStateContext = { approverId: null };
const withApprover: IssueStateContext = { approverId: "usr_approver" };

describe("BacklogState (GoF: State)", () => {
  const s = new BacklogState();
  it("has name 'backlog'", () => expect(s.name).toBe("backlog"));
  it("allows -> todo", () => expect(s.attempt("todo", noApprover).ok).toBe(true));
  it("allows -> canceled", () => expect(s.attempt("canceled", noApprover).ok).toBe(true));
  it("rejects -> in_progress", () => {
    const r = s.attempt("in_progress", noApprover);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_transition");
  });
  it("rejects -> in_review", () => expect(s.attempt("in_review", noApprover).ok).toBe(false));
  it("rejects -> done", () => expect(s.attempt("done", noApprover).ok).toBe(false));
});

describe("TodoState", () => {
  const s = new TodoState();
  it("has name 'todo'", () => expect(s.name).toBe("todo"));
  it("allows -> backlog (demotion)", () =>
    expect(s.attempt("backlog", noApprover).ok).toBe(true));
  it("allows -> in_progress", () =>
    expect(s.attempt("in_progress", noApprover).ok).toBe(true));
  it("allows -> canceled", () => expect(s.attempt("canceled", noApprover).ok).toBe(true));
  it("rejects -> in_review", () => expect(s.attempt("in_review", noApprover).ok).toBe(false));
  it("rejects -> done", () => expect(s.attempt("done", noApprover).ok).toBe(false));
});

describe("InProgressState", () => {
  const s = new InProgressState();
  it("has name 'in_progress'", () => expect(s.name).toBe("in_progress"));
  it("allows -> todo (demotion)", () =>
    expect(s.attempt("todo", noApprover).ok).toBe(true));
  it("allows -> in_review", () =>
    expect(s.attempt("in_review", noApprover).ok).toBe(true));
  it("allows -> canceled", () => expect(s.attempt("canceled", noApprover).ok).toBe(true));
  it("rejects -> backlog", () => expect(s.attempt("backlog", noApprover).ok).toBe(false));
  it("rejects -> done (skip in_review)", () =>
    expect(s.attempt("done", noApprover).ok).toBe(false));
});

describe("InReviewState (approver gate)", () => {
  const s = new InReviewState();
  it("has name 'in_review'", () => expect(s.name).toBe("in_review"));
  it("rejects -> done without approver", () => {
    const r = s.attempt("done", noApprover);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.meta).toMatchObject({ reason: "approver_required" });
    }
  });
  it("allows -> done with approver", () =>
    expect(s.attempt("done", withApprover).ok).toBe(true));
  it("allows -> in_progress (rejected)", () =>
    expect(s.attempt("in_progress", noApprover).ok).toBe(true));
  it("allows -> canceled", () => expect(s.attempt("canceled", noApprover).ok).toBe(true));
  it("rejects -> backlog", () => expect(s.attempt("backlog", noApprover).ok).toBe(false));
});

describe("DoneState", () => {
  const s = new DoneState();
  it("has name 'done'", () => expect(s.name).toBe("done"));
  it("allows -> todo (reopen)", () =>
    expect(s.attempt("todo", noApprover).ok).toBe(true));
  it("rejects all other transitions", () => {
    for (const next of ["backlog", "in_progress", "in_review", "done", "canceled"] as const) {
      expect(s.attempt(next, noApprover).ok).toBe(false);
    }
  });
});

describe("CanceledState (terminal)", () => {
  const s = new CanceledState();
  it("has name 'canceled'", () => expect(s.name).toBe("canceled"));
  it("rejects every outgoing transition with reason terminal_state", () => {
    for (const next of [
      "backlog",
      "todo",
      "in_progress",
      "in_review",
      "done",
      "canceled",
    ] as const) {
      const r = s.attempt(next, noApprover);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.meta).toMatchObject({ reason: "terminal_state" });
      }
    }
  });
});
