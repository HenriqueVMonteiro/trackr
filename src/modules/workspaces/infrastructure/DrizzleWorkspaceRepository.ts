import { and, eq } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { workspaceMembers, workspaces } from "@/infrastructure/db/schema";
import { Workspace, WorkspaceMember } from "../domain";
import type { WorkspaceRepository } from "../application/ports/WorkspaceRepository";

// SOLID: DIP — concretiza a port. Trocar de Drizzle para outro adapter
// (in-memory, Prisma, Supabase Data API) é trocar essa classe sem mexer
// nos use cases.

export class DrizzleWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly db: Database) {}

  async save(workspace: Workspace): Promise<void> {
    const json = workspace.toJSON();
    await this.db
      .insert(workspaces)
      .values({
        id: json.id,
        name: json.name,
        slug: json.slug,
        ownerId: json.ownerId,
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
      })
      .onConflictDoUpdate({
        target: workspaces.id,
        set: { name: json.name, slug: json.slug, updatedAt: json.updatedAt },
      });
  }

  async saveWithOwner(workspace: Workspace, owner: WorkspaceMember): Promise<void> {
    await this.db.transaction(async (tx) => {
      const j = workspace.toJSON();
      await tx.insert(workspaces).values({
        id: j.id,
        name: j.name,
        slug: j.slug,
        ownerId: j.ownerId,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      });
      const m = owner.toJSON();
      await tx.insert(workspaceMembers).values({
        workspaceId: m.workspaceId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
      });
    });
  }

  async findById(id: string): Promise<Workspace | null> {
    const row = await this.db.query.workspaces.findFirst({ where: eq(workspaces.id, id) });
    return row ? this.rowToWorkspace(row) : null;
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const row = await this.db.query.workspaces.findFirst({
      where: eq(workspaces.slug, slug),
    });
    return row ? this.rowToWorkspace(row) : null;
  }

  async listByUserId(userId: string): Promise<Workspace[]> {
    const rows = await this.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));
    return rows.map((r) => this.rowToWorkspace(r));
  }

  async addMember(member: WorkspaceMember): Promise<void> {
    const m = member.toJSON();
    await this.db
      .insert(workspaceMembers)
      .values({
        workspaceId: m.workspaceId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
      })
      .onConflictDoNothing();
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      );
  }

  async findMembership(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    const row = await this.db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    });
    return row
      ? WorkspaceMember.create({
          workspaceId: row.workspaceId,
          userId: row.userId,
          role: row.role,
          joinedAt: row.joinedAt,
        })
      : null;
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const rows = await this.db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    return rows.map((r) =>
      WorkspaceMember.create({
        workspaceId: r.workspaceId,
        userId: r.userId,
        role: r.role,
        joinedAt: r.joinedAt,
      }),
    );
  }

  private rowToWorkspace(row: typeof workspaces.$inferSelect): Workspace {
    return Workspace.fromPersistence({
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerId: row.ownerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
