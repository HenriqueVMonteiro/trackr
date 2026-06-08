import { and, eq } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { sprints, sprintIssues } from "@/infrastructure/db/schema";
import { Sprint } from "../domain";
import type { SprintRepository } from "../application/ports/SprintRepository";

// SOLID: DIP — concretiza a port. Trocar de Drizzle para outro adapter
// (in-memory, Prisma, Supabase Data API) é trocar essa classe sem mexer
// nos use cases.

export class DrizzleSprintRepository implements SprintRepository {
  constructor(private readonly db: Database) {}

  async save(sprint: Sprint): Promise<void> {
    const json = sprint.toJSON();
    await this.db
      .insert(sprints)
      .values({
        id: json.id,
        workspaceId: json.workspaceId,
        name: json.name,
        status: json.status,
        startDate: json.startDate,
        endDate: json.endDate,
        capacity: json.capacity,
        createdAt: json.createdAt,
      })
      .onConflictDoUpdate({
        target: sprints.id,
        set: {
          name: json.name,
          status: json.status,
          startDate: json.startDate,
          endDate: json.endDate,
          capacity: json.capacity,
        },
      });
  }

  async findById(id: string): Promise<Sprint | null> {
    const row = await this.db.query.sprints.findFirst({ where: eq(sprints.id, id) });
    return row ? this.rowToSprint(row) : null;
  }

  async listByWorkspace(workspaceId: string): Promise<Sprint[]> {
    const rows = await this.db.query.sprints.findMany({
      where: eq(sprints.workspaceId, workspaceId),
    });
    return rows.map((r) => this.rowToSprint(r));
  }

  async findActiveByWorkspace(workspaceId: string): Promise<Sprint | null> {
    const row = await this.db.query.sprints.findFirst({
      where: and(eq(sprints.workspaceId, workspaceId), eq(sprints.status, "active")),
    });
    return row ? this.rowToSprint(row) : null;
  }

  async addIssue(sprintId: string, issueId: string): Promise<void> {
    await this.db
      .insert(sprintIssues)
      .values({ sprintId, issueId })
      .onConflictDoNothing();
  }

  async removeIssue(sprintId: string, issueId: string): Promise<void> {
    await this.db
      .delete(sprintIssues)
      .where(
        and(eq(sprintIssues.sprintId, sprintId), eq(sprintIssues.issueId, issueId)),
      );
  }

  async listIssueIds(sprintId: string): Promise<string[]> {
    const rows = await this.db
      .select({ issueId: sprintIssues.issueId })
      .from(sprintIssues)
      .where(eq(sprintIssues.sprintId, sprintId));
    return rows.map((r) => r.issueId);
  }

  private rowToSprint(row: typeof sprints.$inferSelect): Sprint {
    return Sprint.fromPersistence({
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
      capacity: row.capacity,
      createdAt: row.createdAt,
    });
  }
}
