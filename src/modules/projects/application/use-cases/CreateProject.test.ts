import { describe, it, expect } from "vitest";
import { CreateProject } from "./CreateProject";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { ProjectRepository } from "../ports/ProjectRepository";
import type { Project } from "../../domain";

class FakeRepo implements ProjectRepository {
  saved: Project[] = [];
  slugTaken: Project | null = null;
  keyTaken: Project | null = null;
  async save(p: Project): Promise<void> {
    this.saved.push(p);
  }
  async findById(): Promise<Project | null> {
    return null;
  }
  async findByWorkspaceAndSlug(): Promise<Project | null> {
    return this.slugTaken;
  }
  async findByWorkspaceAndKey(): Promise<Project | null> {
    return this.keyTaken;
  }
  async listByWorkspace(): Promise<Project[]> {
    return [];
  }
  async allocateNextIssueNumber(): Promise<number> {
    return 1;
  }
}

describe("CreateProject", () => {
  const actor = "00000000-0000-0000-0000-000000000001";

  const setup = () => {
    const repo = new FakeRepo();
    const events = new InMemoryEventBus();
    const useCase = new CreateProject({
      repo,
      clock: new FrozenClock("2026-06-07T10:00:00Z"),
      ids: new SequentialIdGenerator(),
      events,
    });
    return { repo, events, useCase };
  };

  it("creates a project with provided fields", async () => {
    const { useCase, repo } = setup();
    const r = await useCase.execute({
      actorId: actor,
      workspaceId: "wsp_001",
      name: "Trackr",
      slug: "trackr",
      key: "TRK",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.project.name).toBe("Trackr");
      expect(r.value.project.key).toBe("TRK");
    }
    expect(repo.saved).toHaveLength(1);
  });

  it("ConflictError when slug already in use", async () => {
    const { useCase, repo } = setup();
    const first = await useCase.execute({
      actorId: actor,
      workspaceId: "wsp_001",
      name: "Trackr",
      slug: "trackr",
      key: "TRK",
    });
    if (first.ok) repo.slugTaken = first.value.project;
    const second = await useCase.execute({
      actorId: actor,
      workspaceId: "wsp_001",
      name: "Trackr 2",
      slug: "trackr",
      key: "TRK2",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("conflict");
  });

  it("ConflictError when key already in use", async () => {
    const { useCase, repo } = setup();
    const first = await useCase.execute({
      actorId: actor,
      workspaceId: "wsp_001",
      name: "Trackr",
      slug: "trackr",
      key: "TRK",
    });
    if (first.ok) repo.keyTaken = first.value.project;
    const second = await useCase.execute({
      actorId: actor,
      workspaceId: "wsp_001",
      name: "Other",
      slug: "other",
      key: "TRK",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("conflict");
  });

  it("ValidationError on invalid key", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({
      actorId: actor,
      workspaceId: "wsp_001",
      name: "Trackr",
      slug: "trackr",
      key: "trk", // lowercase
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });

  it("publishes project.created event", async () => {
    const { useCase, events } = setup();
    const seen: unknown[] = [];
    events.subscribe("project.created", async (e) => {
      seen.push(e);
    });
    await useCase.execute({
      actorId: actor,
      workspaceId: "wsp_001",
      name: "Trackr",
      slug: "trackr",
      key: "TRK",
    });
    expect(seen).toHaveLength(1);
  });
});
