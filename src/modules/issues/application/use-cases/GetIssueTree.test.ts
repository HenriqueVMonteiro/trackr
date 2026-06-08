import { describe, it, expect } from "vitest";
import { GetIssueTree } from "./GetIssueTree";
import { Issue, type IssueProps } from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";
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

class FakeRepo implements IssueRepository {
  byId = new Map<string, Issue>();
  byParent = new Map<string, Issue[]>();

  static from(issues: Issue[]): FakeRepo {
    const r = new FakeRepo();
    for (const i of issues) {
      r.byId.set(i.id, i);
      if (i.parentId) {
        const arr = r.byParent.get(i.parentId);
        if (arr) arr.push(i);
        else r.byParent.set(i.parentId, [i]);
      }
    }
    return r;
  }

  async findById(id: string): Promise<Issue | null> {
    return this.byId.get(id) ?? null;
  }
  async findByProjectAndNumber(): Promise<Issue | null> {
    return null;
  }
  async listByProject() {
    return { items: [], nextCursor: null };
  }
  async listChildren(parentId: string): Promise<Issue[]> {
    return this.byParent.get(parentId) ?? [];
  }
  async save(): Promise<void> {}
  async delete(): Promise<void> {}
  async attachLabel(): Promise<void> {}
  async detachLabel(): Promise<void> {}
  async listLabelIds(): Promise<string[]> {
    return [];
  }
}

describe("GetIssueTree (Composite via REST)", () => {
  it("returns a single-node tree when issue has no children", async () => {
    const root = make({ id: "iss_root" });
    const repo = FakeRepo.from([root]);
    const useCase = new GetIssueTree(repo);
    const r = await useCase.execute({ issueId: "iss_root" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.size()).toBe(1);
      expect(r.value.depth()).toBe(0);
    }
  });

  it("returns NotFoundError for unknown issue", async () => {
    const repo = FakeRepo.from([]);
    const r = await new GetIssueTree(repo).execute({ issueId: "iss_nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("builds the full hierarchy across multiple levels", async () => {
    const root = make({ id: "iss_root" });
    const issues = [
      root,
      make({ id: "iss_a", parentId: "iss_root", number: 2 }),
      make({ id: "iss_b", parentId: "iss_root", number: 3 }),
      make({ id: "iss_a1", parentId: "iss_a", number: 4 }),
      make({ id: "iss_a2", parentId: "iss_a", number: 5 }),
      make({ id: "iss_a1a", parentId: "iss_a1", number: 6 }),
    ];
    const r = await new GetIssueTree(FakeRepo.from(issues)).execute({ issueId: "iss_root" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.size()).toBe(6);
    expect(r.value.depth()).toBe(3);
  });

  it("respects maxDepth", async () => {
    const issues = [
      make({ id: "iss_root" }),
      make({ id: "iss_a", parentId: "iss_root", number: 2 }),
      make({ id: "iss_a1", parentId: "iss_a", number: 3 }),
      make({ id: "iss_a1a", parentId: "iss_a1", number: 4 }),
    ];
    const r = await new GetIssueTree(FakeRepo.from(issues)).execute({
      issueId: "iss_root",
      maxDepth: 2,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // depth 0 root, depth 1 (a), depth 2 (a1); deeper (a1a) is cut
    expect(r.value.size()).toBe(3);
  });

  it("breaks on cycles defensively (does not infinite-loop)", async () => {
    // Simulate a bad data state where two issues claim each other as parent
    const a = make({ id: "iss_a", parentId: "iss_b" });
    const b = make({ id: "iss_b", parentId: "iss_a", number: 2 });
    const repo = FakeRepo.from([a, b]);
    // listChildren by graph traversal would normally loop; we want the use case
    // to terminate via maxDepth fence
    const r = await new GetIssueTree(repo).execute({ issueId: "iss_a", maxDepth: 5 });
    expect(r.ok).toBe(true); // doesn't hang
  });
});
