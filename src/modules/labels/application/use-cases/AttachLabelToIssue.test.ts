import { describe, it, expect } from "vitest";
import { AttachLabelToIssue } from "./AttachLabelToIssue";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { LabelRepository } from "../ports/LabelRepository";
import type { IssueRepository } from "@/modules/issues/application/ports/IssueRepository";
import { Issue } from "@/modules/issues/domain";
import { Label } from "../../domain";
import { unwrap } from "@/shared/result";

class FakeLabelRepo implements LabelRepository {
  byId: Label | null = null;
  async save(): Promise<void> {}
  async findById(): Promise<Label | null> {
    return this.byId;
  }
  async findByProjectAndName(): Promise<Label | null> {
    return null;
  }
  async listByProject(): Promise<Label[]> {
    return [];
  }
  async delete(): Promise<void> {}
}

class FakeIssueRepo implements IssueRepository {
  byId: Issue | null = null;
  attached: Array<{ issueId: string; labelId: string }> = [];
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
  async attachLabel(issueId: string, labelId: string): Promise<void> {
    this.attached.push({ issueId, labelId });
  }
  async detachLabel(): Promise<void> {}
  async listLabelIds(): Promise<string[]> {
    return [];
  }
}

const makeIssue = (projectId = "prj_001") =>
  unwrap(
    Issue.create({
      id: "iss_001",
      projectId,
      number: 1,
      title: "x",
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
    }),
  );

const makeLabel = (projectId = "prj_001") =>
  unwrap(
    Label.create({
      id: "lbl_001",
      projectId,
      name: "bug",
      color: "#ff0000",
      createdAt: new Date("2026-06-07T10:00:00Z"),
    }),
  );

describe("AttachLabelToIssue", () => {
  const actor = "00000000-0000-0000-0000-000000000099";

  const setup = (issue: Issue | null, label: Label | null) => {
    const issueRepo = new FakeIssueRepo();
    const labelRepo = new FakeLabelRepo();
    issueRepo.byId = issue;
    labelRepo.byId = label;
    const events = new InMemoryEventBus();
    const useCase = new AttachLabelToIssue({
      issueRepo,
      labelRepo,
      clock: new FrozenClock("2026-06-07T12:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { issueRepo, labelRepo, events, useCase };
  };

  it("attaches a label to an issue", async () => {
    const { useCase, issueRepo } = setup(makeIssue(), makeLabel());
    const r = await useCase.execute({
      actorId: actor,
      issueId: "iss_001",
      labelId: "lbl_001",
    });
    expect(r.ok).toBe(true);
    expect(issueRepo.attached).toEqual([{ issueId: "iss_001", labelId: "lbl_001" }]);
  });

  it("NotFoundError when issue missing", async () => {
    const { useCase } = setup(null, makeLabel());
    const r = await useCase.execute({
      actorId: actor,
      issueId: "iss_001",
      labelId: "lbl_001",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("NotFoundError when label missing", async () => {
    const { useCase } = setup(makeIssue(), null);
    const r = await useCase.execute({
      actorId: actor,
      issueId: "iss_001",
      labelId: "lbl_001",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("ValidationError when label and issue are in different projects", async () => {
    const { useCase } = setup(makeIssue("prj_001"), makeLabel("prj_999"));
    const r = await useCase.execute({
      actorId: actor,
      issueId: "iss_001",
      labelId: "lbl_001",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("publishes issue.labeled event", async () => {
    const { useCase, events } = setup(makeIssue(), makeLabel());
    const seen: unknown[] = [];
    events.subscribe("issue.labeled", async (e) => {
      seen.push(e);
    });
    await useCase.execute({ actorId: actor, issueId: "iss_001", labelId: "lbl_001" });
    expect(seen).toHaveLength(1);
  });
});
