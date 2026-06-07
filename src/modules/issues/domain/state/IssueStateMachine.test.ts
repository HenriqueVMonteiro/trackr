import { describe, it, expect } from "vitest";
import { IssueStateMachine } from "./IssueStateMachine";
import type { IssueStatus } from "../IssueStatus";

const noApprover = { approverId: null };
const withApprover = { approverId: "usr_approver" };
const allStatuses: IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
];

describe("IssueStateMachine - backlog", () => {
  it("allows transition to todo", () => {
    expect(IssueStateMachine.transition("backlog", "todo", noApprover).ok).toBe(true);
  });
  it("allows transition to canceled", () => {
    expect(IssueStateMachine.transition("backlog", "canceled", noApprover).ok).toBe(true);
  });
  it("rejects transition to in_progress", () => {
    const r = IssueStateMachine.transition("backlog", "in_progress", noApprover);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_transition");
  });
  it("rejects transition to in_review", () => {
    expect(IssueStateMachine.transition("backlog", "in_review", noApprover).ok).toBe(false);
  });
  it("rejects transition to done", () => {
    expect(IssueStateMachine.transition("backlog", "done", noApprover).ok).toBe(false);
  });
});

describe("IssueStateMachine - todo", () => {
  it("allows demotion to backlog", () => {
    expect(IssueStateMachine.transition("todo", "backlog", noApprover).ok).toBe(true);
  });
  it("allows promotion to in_progress", () => {
    expect(IssueStateMachine.transition("todo", "in_progress", noApprover).ok).toBe(true);
  });
  it("allows cancel", () => {
    expect(IssueStateMachine.transition("todo", "canceled", noApprover).ok).toBe(true);
  });
  it("rejects skip to in_review", () => {
    expect(IssueStateMachine.transition("todo", "in_review", noApprover).ok).toBe(false);
  });
  it("rejects skip to done", () => {
    expect(IssueStateMachine.transition("todo", "done", noApprover).ok).toBe(false);
  });
});

describe("IssueStateMachine - in_progress", () => {
  it("allows in_review", () => {
    expect(IssueStateMachine.transition("in_progress", "in_review", noApprover).ok).toBe(true);
  });
  it("allows demotion to todo", () => {
    expect(IssueStateMachine.transition("in_progress", "todo", noApprover).ok).toBe(true);
  });
  it("allows cancel", () => {
    expect(IssueStateMachine.transition("in_progress", "canceled", noApprover).ok).toBe(true);
  });
  it("rejects skip to done", () => {
    expect(IssueStateMachine.transition("in_progress", "done", noApprover).ok).toBe(false);
  });
});

describe("IssueStateMachine - in_review", () => {
  it("rejects done without approver", () => {
    const r = IssueStateMachine.transition("in_review", "done", noApprover);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("invalid_transition");
      expect(r.error.meta).toMatchObject({ reason: "approver_required" });
    }
  });
  it("allows done with approver", () => {
    expect(IssueStateMachine.transition("in_review", "done", withApprover).ok).toBe(true);
  });
  it("allows rejection back to in_progress", () => {
    expect(IssueStateMachine.transition("in_review", "in_progress", noApprover).ok).toBe(true);
  });
  it("allows cancel", () => {
    expect(IssueStateMachine.transition("in_review", "canceled", noApprover).ok).toBe(true);
  });
});

describe("IssueStateMachine - done", () => {
  it("only allows reopen as todo", () => {
    expect(IssueStateMachine.transition("done", "todo", noApprover).ok).toBe(true);
  });
  it("rejects all other transitions", () => {
    for (const next of allStatuses) {
      if (next === "todo" || next === "done") continue;
      expect(IssueStateMachine.transition("done", next, noApprover).ok).toBe(false);
    }
  });
});

describe("IssueStateMachine - canceled (terminal)", () => {
  it("rejects every outgoing transition", () => {
    for (const next of allStatuses) {
      if (next === "canceled") continue;
      const r = IssueStateMachine.transition("canceled", next, noApprover);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.meta).toMatchObject({ reason: "terminal_state" });
    }
  });
});

describe("IssueStateMachine.canTransition", () => {
  it("is a boolean helper consistent with transition()", () => {
    expect(IssueStateMachine.canTransition("backlog", "todo", noApprover)).toBe(true);
    expect(IssueStateMachine.canTransition("done", "in_progress", noApprover)).toBe(false);
  });
});

describe("IssueStateMachine.of", () => {
  it("returns the state instance for the status name", () => {
    expect(IssueStateMachine.of("backlog").name).toBe("backlog");
    expect(IssueStateMachine.of("canceled").name).toBe("canceled");
  });
});
