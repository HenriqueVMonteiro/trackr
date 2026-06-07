import { describe, it, expect } from "vitest";
import { Issue, type IssueProps } from "./Issue";
import { isErr, unwrap } from "@/shared/result";

const baseProps = (overrides: Partial<IssueProps> = {}): IssueProps => ({
  id: "iss_001",
  projectId: "prj_001",
  number: 1,
  title: "Add login",
  description: null,
  status: "backlog",
  priority: "medium",
  assigneeId: null,
  approverId: null,
  parentId: null,
  createdBy: "00000000-0000-0000-0000-000000000001",
  createdAt: new Date("2026-06-07T10:00:00Z"),
  updatedAt: new Date("2026-06-07T10:00:00Z"),
  closedAt: null,
  canceledAt: null,
  ...overrides,
});

describe("Issue.create", () => {
  it("trims and validates title", () => {
    const r = Issue.create(baseProps({ title: "  Hello  " }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.title).toBe("Hello");
  });

  it("rejects empty title", () => {
    expect(isErr(Issue.create(baseProps({ title: "" })))).toBe(true);
  });

  it("rejects title over 200 chars", () => {
    expect(isErr(Issue.create(baseProps({ title: "x".repeat(201) })))).toBe(true);
  });

  it("rejects number 0 or negative", () => {
    expect(isErr(Issue.create(baseProps({ number: 0 })))).toBe(true);
    expect(isErr(Issue.create(baseProps({ number: -1 })))).toBe(true);
  });
});

describe("Issue.transitionTo", () => {
  const at = new Date("2026-06-08T10:00:00Z");

  it("backlog -> todo updates status and updatedAt; no closedAt", () => {
    const issue = unwrap(Issue.create(baseProps()));
    const r = issue.transitionTo("todo", at);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("todo");
      expect(r.value.updatedAt.toISOString()).toBe(at.toISOString());
      expect(r.value.closedAt).toBeNull();
    }
  });

  it("in_review -> done with approver sets closedAt", () => {
    const issue = unwrap(
      Issue.create(baseProps({ status: "in_review", approverId: "usr_approver" })),
    );
    const r = issue.transitionTo("done", at);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.status).toBe("done");
      expect(r.value.closedAt?.toISOString()).toBe(at.toISOString());
    }
  });

  it("in_review -> done without approver fails with approver_required", () => {
    const issue = unwrap(Issue.create(baseProps({ status: "in_review" })));
    const r = issue.transitionTo("done", at);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("invalid_transition");
      expect(r.error.meta).toMatchObject({ reason: "approver_required" });
    }
  });

  it("done -> todo clears closedAt (reopen)", () => {
    const issue = unwrap(
      Issue.create(
        baseProps({
          status: "done",
          closedAt: new Date("2026-06-07T15:00:00Z"),
          approverId: "usr_approver",
        }),
      ),
    );
    const r = issue.transitionTo("todo", at);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.closedAt).toBeNull();
  });

  it("canceled is terminal", () => {
    const issue = unwrap(
      Issue.create(
        baseProps({ status: "canceled", canceledAt: new Date("2026-06-07T15:00:00Z") }),
      ),
    );
    expect(issue.transitionTo("todo", at).ok).toBe(false);
    expect(issue.transitionTo("in_progress", at).ok).toBe(false);
  });

  it("returns a new instance; original is untouched", () => {
    const issue = unwrap(Issue.create(baseProps()));
    const r = issue.transitionTo("todo", at);
    expect(r.ok).toBe(true);
    expect(issue.status).toBe("backlog");
  });
});

describe("Issue.assign", () => {
  const at = new Date("2026-06-08T10:00:00Z");
  it("sets a new assignee", () => {
    const issue = unwrap(Issue.create(baseProps()));
    const assigned = issue.assign("00000000-0000-0000-0000-000000000099", at);
    expect(assigned.assigneeId).toBe("00000000-0000-0000-0000-000000000099");
    expect(assigned.updatedAt.toISOString()).toBe(at.toISOString());
  });

  it("clears assignee with null", () => {
    const issue = unwrap(Issue.create(baseProps({ assigneeId: "usr_old" })));
    const assigned = issue.assign(null, at);
    expect(assigned.assigneeId).toBeNull();
  });

  it("returns same instance when assignee unchanged", () => {
    const issue = unwrap(Issue.create(baseProps({ assigneeId: "usr_x" })));
    const r = issue.assign("usr_x", at);
    expect(r).toBe(issue);
  });
});

describe("Issue.edit", () => {
  const at = new Date("2026-06-08T10:00:00Z");
  it("updates title", () => {
    const issue = unwrap(Issue.create(baseProps()));
    const r = issue.edit({ title: "Better title" }, at);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.title).toBe("Better title");
  });

  it("rejects invalid title", () => {
    const issue = unwrap(Issue.create(baseProps()));
    const r = issue.edit({ title: "" }, at);
    expect(r.ok).toBe(false);
  });

  it("returns same instance when nothing changed", () => {
    const issue = unwrap(Issue.create(baseProps()));
    const r = issue.edit({ title: "Add login", description: null }, at);
    if (r.ok) expect(r.value).toBe(issue);
  });
});
