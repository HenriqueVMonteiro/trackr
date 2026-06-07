import { describe, it, expect } from "vitest";
import { InviteMember } from "./InviteMember";
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
  async findMembership(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return (
      this.members.find((m) => m.workspaceId === workspaceId && m.userId === userId) ?? null
    );
  }
  async listMembers(): Promise<WorkspaceMember[]> {
    return [];
  }
}

describe("InviteMember", () => {
  const owner = "00000000-0000-0000-0000-000000000001";
  const guest = "00000000-0000-0000-0000-000000000002";
  const stranger = "00000000-0000-0000-0000-000000000003";

  const setup = async () => {
    const repo = new FakeRepo();
    const clock = new FrozenClock("2026-06-07T10:00:00Z");
    const ids = new SequentialIdGenerator();
    const events = new InMemoryEventBus();
    const create = new CreateWorkspace({ repo, clock, ids, events });
    const r = await create.execute({ name: "Acme", slug: "acme", ownerId: owner });
    if (!r.ok) throw new Error("seed failed");
    const invite = new InviteMember({ repo, clock, ids, events });
    return { repo, invite, workspaceId: r.value.workspace.id };
  };

  it("owner can invite a new member", async () => {
    const { invite, workspaceId, repo } = await setup();
    const r = await invite.execute({
      actorId: owner,
      workspaceId,
      userId: guest,
      role: "member",
    });
    expect(r.ok).toBe(true);
    expect(repo.members.some((m) => m.userId === guest)).toBe(true);
  });

  it("non-owner cannot invite — ForbiddenError", async () => {
    const { invite, workspaceId } = await setup();
    const r = await invite.execute({
      actorId: stranger,
      workspaceId,
      userId: guest,
      role: "member",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("forbidden");
  });

  it("inviting existing member returns ConflictError", async () => {
    const { invite, workspaceId } = await setup();
    await invite.execute({ actorId: owner, workspaceId, userId: guest, role: "member" });
    const r = await invite.execute({
      actorId: owner,
      workspaceId,
      userId: guest,
      role: "member",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("conflict");
  });

  it("inviting to unknown workspace returns NotFoundError", async () => {
    const { invite } = await setup();
    const r = await invite.execute({
      actorId: owner,
      workspaceId: "wsp_nope",
      userId: guest,
      role: "member",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });
});
