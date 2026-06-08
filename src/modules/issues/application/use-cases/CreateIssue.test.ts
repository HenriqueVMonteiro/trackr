import { describe, it, expect } from "vitest";
import { CreateIssue } from "./CreateIssue";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { IssueRepository } from "../ports/IssueRepository";
import type { ActivityRepository } from "../ports/ActivityRepository";
import type { ProjectRepository } from "@/modules/projects/application/ports/ProjectRepository";
import type { Issue } from "../../domain";
import type { ActivitySnapshot } from "../../domain/ActivitySnapshot";
import { Project } from "@/modules/projects/domain";
import { unwrap } from "@/shared/result";

class FakeIssueRepo implements IssueRepository {
  saved: Issue[] = [];
  async findById(): Promise<Issue | null> {
    return null;
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
  async save(issue: Issue): Promise<void> {
    this.saved.push(issue);
  }
  async delete(): Promise<void> {}
  async attachLabel(): Promise<void> {}
  async detachLabel(): Promise<void> {}
  async listLabelIds(): Promise<string[]> {
    return [];
  }
}

class FakeActivityRepo implements ActivityRepository {
  saved: ActivitySnapshot[] = [];
  async save(s: ActivitySnapshot): Promise<void> {
    this.saved.push(s);
  }
  async listByIssue(): Promise<ActivitySnapshot[]> {
    return [...this.saved];
  }
}

class FakeProjectRepo implements ProjectRepository {
  project: Project | null;
  counter = 1;
  constructor(project: Project | null) {
    this.project = project;
  }
  async save(): Promise<void> {}
  async findById(id: string): Promise<Project | null> {
    return this.project?.id === id ? this.project : null;
  }
  async findByWorkspaceAndSlug(): Promise<Project | null> {
    return null;
  }
  async findByWorkspaceAndKey(): Promise<Project | null> {
    return null;
  }
  async listByWorkspace(): Promise<Project[]> {
    return [];
  }
  async allocateNextIssueNumber(): Promise<number> {
    return this.counter++;
  }
}

const makeProject = () =>
  unwrap(
    Project.create({
      id: "prj_001",
      workspaceId: "wsp_001",
      name: "Demo",
      slug: "demo",
      key: "DEMO",
      description: null,
      archivedAt: null,
      createdAt: new Date("2026-06-07T10:00:00Z"),
      updatedAt: new Date("2026-06-07T10:00:00Z"),
    }),
  );

describe("CreateIssue", () => {
  const actorId = "00000000-0000-0000-0000-000000000001";

  const setup = (project: Project | null = makeProject()) => {
    const issueRepo = new FakeIssueRepo();
    const activityRepo = new FakeActivityRepo();
    const projectRepo = new FakeProjectRepo(project);
    const clock = new FrozenClock("2026-06-07T10:00:00Z");
    const ids = new SequentialIdGenerator();
    const events = new InMemoryEventBus();
    const useCase = new CreateIssue({
      issueRepo,
      activityRepo,
      projectRepo,
      clock,
      ids,
      events,
    });
    return { issueRepo, activityRepo, projectRepo, clock, ids, events, useCase };
  };

  it("creates an issue with backlog status and allocated number", async () => {
    const { useCase, issueRepo } = setup();
    const r = await useCase.execute({
      actorId,
      projectId: "prj_001",
      title: "Fix login",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.issue.status).toBe("backlog");
    expect(r.value.issue.number).toBe(1);
    expect(r.value.issue.title).toBe("Fix login");
    expect(issueRepo.saved).toHaveLength(1);
  });

  it("allocates sequential numbers from the project counter", async () => {
    const { useCase } = setup();
    const r1 = await useCase.execute({ actorId, projectId: "prj_001", title: "One" });
    const r2 = await useCase.execute({ actorId, projectId: "prj_001", title: "Two" });
    if (!r1.ok || !r2.ok) throw new Error("expected ok");
    expect(r1.value.issue.number).toBe(1);
    expect(r2.value.issue.number).toBe(2);
  });

  it("rejects unknown project with NotFoundError", async () => {
    const { useCase } = setup(null);
    const r = await useCase.execute({ actorId, projectId: "prj_nope", title: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("rejects invalid title with ValidationError", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({ actorId, projectId: "prj_001", title: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("publishes IssueCreated event", async () => {
    const { useCase, events } = setup();
    const subjects: unknown[] = [];
    events.subscribe("issue.created", async (e) => {
      subjects.push(e);
    });
    await useCase.execute({ actorId, projectId: "prj_001", title: "Hello" });
    expect(subjects).toHaveLength(1);
  });

  it("persists a creation ActivitySnapshot (Memento) with before=null", async () => {
    const { useCase, activityRepo } = setup();
    await useCase.execute({ actorId, projectId: "prj_001", title: "Hello" });
    expect(activityRepo.saved).toHaveLength(1);
    const snap = activityRepo.saved[0];
    expect(snap?.action).toBe("created");
    expect(snap?.before).toBeNull();
    expect(snap?.isCreation()).toBe(true);
  });
});
