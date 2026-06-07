import { describe, it, expect, vi } from "vitest";
import { CreateWorkspace } from "./CreateWorkspace";
import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import type { WorkspaceRepository } from "../ports/WorkspaceRepository";
import type { Workspace, WorkspaceMember } from "../../domain";

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
    for (const w of this.workspaces.values()) {
      if (w.slug === slug) return w;
    }
    return null;
  }
  async listByUserId(userId: string): Promise<Workspace[]> {
    const ids = this.members.filter((m) => m.userId === userId).map((m) => m.workspaceId);
    return [...this.workspaces.values()].filter((w) => ids.includes(w.id));
  }
  async addMember(m: WorkspaceMember): Promise<void> {
    this.members.push(m);
  }
  async removeMember(): Promise<void> {}
  async findMembership(): Promise<WorkspaceMember | null> {
    return null;
  }
  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.members.filter((m) => m.workspaceId === workspaceId);
  }
}

describe("CreateWorkspace", () => {
  const now = new Date("2026-06-07T10:00:00Z");
  const ownerId = "00000000-0000-0000-0000-000000000001";

  const setup = () => {
    const repo = new FakeRepo();
    const clock = new FrozenClock(now);
    const ids = new SequentialIdGenerator();
    const events = new InMemoryEventBus();
    const useCase = new CreateWorkspace({ repo, clock, ids, events });
    return { repo, clock, ids, events, useCase };
  };

  it("creates a workspace with the owner as initial member", async () => {
    const { repo, useCase } = setup();
    const r = await useCase.execute({ name: "Acme", slug: "acme", ownerId });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.workspace.name).toBe("Acme");
    expect(r.value.workspace.slug).toBe("acme");
    expect(repo.workspaces.size).toBe(1);
    expect(repo.members).toHaveLength(1);
    expect(repo.members[0]?.userId).toBe(ownerId);
    expect(repo.members[0]?.role).toBe("owner");
  });

  it("publishes WorkspaceCreated event", async () => {
    const { events, useCase } = setup();
    const handler = vi.fn(async (_event: unknown): Promise<void> => undefined);
    events.subscribe("workspace.created", handler);
    await useCase.execute({ name: "Acme", slug: "acme", ownerId });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "workspace.created",
        payload: expect.objectContaining({ ownerId, name: "Acme", slug: "acme" }),
      }),
    );
  });

  it("rejects duplicate slug with ConflictError", async () => {
    const { useCase } = setup();
    await useCase.execute({ name: "Acme", slug: "acme", ownerId });
    const r = await useCase.execute({ name: "Acme Two", slug: "acme", ownerId });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("conflict");
    }
  });

  it("rejects invalid slug with ValidationError", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({ name: "Acme", slug: "ACME", ownerId });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });
});
