import { describe, it, expect } from "vitest";
import { ActivitySnapshot } from "./ActivitySnapshot";
import { Issue, type IssueProps } from "./Issue";
import { unwrap } from "@/shared/result";

const make = (overrides: Partial<IssueProps>) =>
  unwrap(
    Issue.create({
      id: "iss_1",
      projectId: "prj_1",
      number: 1,
      title: "title",
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

describe("ActivitySnapshot.capture", () => {
  const at = new Date("2026-06-07T12:00:00Z");

  it("creation snapshot has before=null and isCreation=true", () => {
    const issue = make({});
    const snap = ActivitySnapshot.capture({
      id: "act_1",
      actorId: "00000000-0000-0000-0000-000000000099",
      action: "created",
      before: null,
      after: issue,
      at,
    });
    expect(snap.isCreation()).toBe(true);
    expect(snap.before).toBeNull();
    expect(snap.diff.fields["created"]).toBeDefined();
  });

  it("captures status change in diff", () => {
    const before = make({ status: "todo" });
    const after = make({ status: "in_progress", updatedAt: at });
    const snap = ActivitySnapshot.capture({
      id: "act_2",
      actorId: "00000000-0000-0000-0000-000000000099",
      action: "transitioned",
      before,
      after,
      at,
    });
    expect(snap.diff.fields["status"]).toEqual({ from: "todo", to: "in_progress" });
    expect(snap.changedFields()).toContain("status");
  });

  it("captures priority change", () => {
    const before = make({ priority: "low" });
    const after = make({ priority: "high", updatedAt: at });
    const snap = ActivitySnapshot.capture({
      id: "act_3",
      actorId: "u",
      action: "priority_changed",
      before,
      after,
      at,
    });
    expect(snap.diff.fields["priority"]).toEqual({ from: "low", to: "high" });
  });

  it("ignores updatedAt field (volatile)", () => {
    const before = make({ updatedAt: new Date("2026-06-07T10:00:00Z") });
    const after = make({ updatedAt: at });
    const snap = ActivitySnapshot.capture({
      id: "act_4",
      actorId: "u",
      action: "no_op",
      before,
      after,
      at,
    });
    expect(snap.diff.fields["updatedAt"]).toBeUndefined();
    expect(snap.changedFields()).toEqual([]);
  });

  it("captures multiple field changes", () => {
    const before = make({ title: "Old", priority: "low", status: "todo" });
    const after = make({
      title: "New",
      priority: "urgent",
      status: "in_progress",
      updatedAt: at,
    });
    const snap = ActivitySnapshot.capture({
      id: "act_5",
      actorId: "u",
      action: "multi_edit",
      before,
      after,
      at,
    });
    const fields = snap.changedFields().sort();
    expect(fields).toEqual(["priority", "status", "title"]);
  });

  it("preserves before snapshot for time travel", () => {
    const before = make({ title: "Original" });
    const after = make({ title: "Modified" });
    const snap = ActivitySnapshot.capture({
      id: "act_6",
      actorId: "u",
      action: "edited",
      before,
      after,
      at,
    });
    expect(snap.before?.title).toBe("Original");
    expect(snap.after.title).toBe("Modified");
  });
});

describe("ActivitySnapshot.fromPersistence", () => {
  it("rehydrates a snapshot without recomputing diff", () => {
    const at = new Date("2026-06-07T12:00:00Z");
    const before = make({ status: "todo" }).toJSON();
    const after = make({ status: "done" }).toJSON();
    const snap = ActivitySnapshot.fromPersistence({
      id: "act_x",
      issueId: "iss_1",
      actorId: "u",
      action: "transitioned",
      before,
      after,
      diff: { fields: { status: { from: "todo", to: "done" } } },
      createdAt: at,
    });
    expect(snap.diff.fields["status"]).toEqual({ from: "todo", to: "done" });
    expect(snap.isCreation()).toBe(false);
  });
});
