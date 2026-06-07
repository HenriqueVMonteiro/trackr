import { describe, it, expect } from "vitest";
import { IssueTree, buildIssueTree } from "./IssueTree";
import { Issue, type IssueProps } from "./Issue";
import { unwrap } from "@/shared/result";

const make = (overrides: Partial<IssueProps>) =>
  unwrap(
    Issue.create({
      id: "iss",
      projectId: "prj_1",
      number: 1,
      title: "x",
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

describe("IssueTree (Composite)", () => {
  it("size of a single-node tree is 1", () => {
    const t = new IssueTree(make({ id: "iss_1" }), []);
    expect(t.size()).toBe(1);
    expect(t.depth()).toBe(0);
  });

  it("size and depth of a flat tree with 2 children", () => {
    const root = make({ id: "iss_root" });
    const c1 = new IssueTree(make({ id: "iss_c1", parentId: "iss_root", number: 2 }), []);
    const c2 = new IssueTree(make({ id: "iss_c2", parentId: "iss_root", number: 3 }), []);
    const t = new IssueTree(root, [c1, c2]);
    expect(t.size()).toBe(3);
    expect(t.depth()).toBe(1);
  });

  it("size of a nested tree (root -> c -> gc)", () => {
    const gc = new IssueTree(make({ id: "iss_gc", parentId: "iss_c", number: 3 }), []);
    const c = new IssueTree(make({ id: "iss_c", parentId: "iss_root", number: 2 }), [gc]);
    const root = new IssueTree(make({ id: "iss_root" }), [c]);
    expect(root.size()).toBe(3);
    expect(root.depth()).toBe(2);
  });

  it("flatten returns issues in pre-order", () => {
    const gc = new IssueTree(make({ id: "iss_gc", parentId: "iss_c", number: 3 }), []);
    const c = new IssueTree(make({ id: "iss_c", parentId: "iss_root", number: 2 }), [gc]);
    const c2 = new IssueTree(make({ id: "iss_c2", parentId: "iss_root", number: 4 }), []);
    const root = new IssueTree(make({ id: "iss_root" }), [c, c2]);
    const ids = root.flatten().map((i) => i.id);
    expect(ids).toEqual(["iss_root", "iss_c", "iss_gc", "iss_c2"]);
  });

  it("walk receives depth values", () => {
    const gc = new IssueTree(make({ id: "iss_gc", parentId: "iss_c", number: 3 }), []);
    const c = new IssueTree(make({ id: "iss_c", parentId: "iss_root", number: 2 }), [gc]);
    const root = new IssueTree(make({ id: "iss_root" }), [c]);
    const depths: number[] = [];
    root.walk((_i, d) => depths.push(d));
    expect(depths).toEqual([0, 1, 2]);
  });

  it("progressPercent with no children: 0 if not done, 100 if done", () => {
    const open = new IssueTree(make({ id: "iss_1", status: "todo" }), []);
    const done = new IssueTree(make({ id: "iss_2", status: "done" }), []);
    expect(open.progressPercent()).toBe(0);
    expect(done.progressPercent()).toBe(100);
  });

  it("progressPercent counts only sub-tasks, not the root", () => {
    const root = make({ id: "iss_root", status: "in_progress" });
    const c1 = new IssueTree(make({ id: "iss_c1", parentId: "iss_root", status: "done" }), []);
    const c2 = new IssueTree(make({ id: "iss_c2", parentId: "iss_root", status: "done" }), []);
    const c3 = new IssueTree(make({ id: "iss_c3", parentId: "iss_root", status: "todo" }), []);
    const c4 = new IssueTree(make({ id: "iss_c4", parentId: "iss_root", status: "todo" }), []);
    const t = new IssueTree(root, [c1, c2, c3, c4]);
    expect(t.progressPercent()).toBe(50);
  });

  it("progressPercent counts nested descendants too", () => {
    const root = make({ id: "iss_root" });
    const gc = new IssueTree(make({ id: "iss_gc", parentId: "iss_c", status: "done" }), []);
    const c = new IssueTree(make({ id: "iss_c", parentId: "iss_root", status: "in_progress" }), [
      gc,
    ]);
    const t = new IssueTree(root, [c]);
    // 2 descendants (c, gc), 1 done -> 50%
    expect(t.progressPercent()).toBe(50);
  });
});

describe("buildIssueTree", () => {
  it("builds a single-node tree when no descendants", () => {
    const root = make({ id: "iss_root" });
    const t = buildIssueTree(root, []);
    expect(t.size()).toBe(1);
  });

  it("builds hierarchy from a flat list", () => {
    const root = make({ id: "iss_root" });
    const descendants = [
      make({ id: "iss_a", parentId: "iss_root", number: 2 }),
      make({ id: "iss_b", parentId: "iss_root", number: 3 }),
      make({ id: "iss_a1", parentId: "iss_a", number: 4 }),
    ];
    const t = buildIssueTree(root, descendants);
    expect(t.size()).toBe(4);
    expect(t.depth()).toBe(2);
    const ids = t.flatten().map((i) => i.id);
    expect(ids).toEqual(["iss_root", "iss_a", "iss_a1", "iss_b"]);
  });

  it("ignores orphan descendants (parent not in scope)", () => {
    const root = make({ id: "iss_root" });
    const orphans = [
      make({ id: "iss_x", parentId: "iss_unrelated" }),
      make({ id: "iss_y", parentId: "iss_root", number: 2 }),
    ];
    const t = buildIssueTree(root, orphans);
    expect(t.size()).toBe(2);
  });
});
