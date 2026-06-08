import { describe, it, expect } from "vitest";
import { RenameWorkspace } from "./RenameWorkspace";
import { CreateWorkspace } from "./CreateWorkspace";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { WorkspaceRepository } from "../ports/WorkspaceRepository";
import type { WorkspaceMember } from "../../domain";
import { type Workspace } from "../../domain";

class FakeRepo implements WorkspaceRepository {
  workspaces = new Map<string, Workspace>();
  members: WorkspaceMember[] = [];
  async save(w: Workspace): Promise<void> {
    this.workspaces.set(w.id, w);
  }
  async saveWithOwner(w: Workspace, m: WorkspaceMember): Promise<void> {
    this.workspaces.set(w.id, w);
    this.members.push(m);
  }
  async findById(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) ?? null;
  }
  async findBySlug(slug: string): Promise<Workspace | null> {
    return [...this.workspaces.values()].find((w) => w.slug === slug) ?? null;
  }
  async listByUserId(): Promise<Workspace[]> {
    return [];
  }
  async addMember(m: WorkspaceMember): Promise<void> {
    this.members.push(m);
  }
  async removeMember(): Promise<void> {}
  async findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return (
      this.members.find((m) => m.workspaceId === workspaceId && m.userId === userId) ?? null
    );
  }
  async listMembers(): Promise<WorkspaceMember[]> {
    return [];
  }
}

describe("RenameWorkspace", () => {
  const owner = "00000000-0000-0000-0000-000000000001";
  const stranger = "00000000-0000-0000-0000-000000000099";

  const setup = async () => {
    const repo = new FakeRepo();
    const clock = new FrozenClock("2026-06-07T10:00:00Z");
    const ids = new SequentialIdGenerator();
    const events = new InMemoryEventBus();
    const seed = await new CreateWorkspace({ repo, clock, ids, events }).execute({
      name: "Acme",
      slug: "acme",
      ownerId: owner,
    });
    if (!seed.ok) throw new Error("seed failed");
    const useCase = new RenameWorkspace({ repo, clock, ids, events });
    return { repo, events, useCase, workspaceId: seed.value.workspace.id };
  };

  it("owner can rename", async () => {
    const { useCase, workspaceId } = await setup();
    const r = await useCase.execute({
      actorId: owner,
      workspaceId,
      newName: "Acme Corp",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.name).toBe("Acme Corp");
  });

  it("non-owner gets ForbiddenError", async () => {
    const { useCase, workspaceId } = await setup();
    const r = await useCase.execute({
      actorId: stranger,
      workspaceId,
      newName: "Acme Corp",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
  });

  it("unknown workspace returns NotFoundError", async () => {
    const { useCase } = await setup();
    const r = await useCase.execute({
      actorId: owner,
      workspaceId: "wsp_nope",
      newName: "X",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("ValidationError on too-short name", async () => {
    const { useCase, workspaceId } = await setup();
    const r = await useCase.execute({
      actorId: owner,
      workspaceId,
      newName: "a",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });
});
