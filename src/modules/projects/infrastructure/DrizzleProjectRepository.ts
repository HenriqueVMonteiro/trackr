import { and, eq, sql } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { projects } from "@/infrastructure/db/schema";
import { Project } from "../domain";
import type { ProjectRepository } from "../application/ports/ProjectRepository";

export class DrizzleProjectRepository implements ProjectRepository {
  constructor(private readonly db: Database) {}

  async save(project: Project): Promise<void> {
    const j = project.toJSON();
    await this.db
      .insert(projects)
      .values({
        id: j.id,
        workspaceId: j.workspaceId,
        name: j.name,
        slug: j.slug,
        key: j.key,
        description: j.description,
        archivedAt: j.archivedAt,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: j.name,
          description: j.description,
          archivedAt: j.archivedAt,
          updatedAt: j.updatedAt,
        },
      });
  }

  async findById(id: string): Promise<Project | null> {
    const row = await this.db.query.projects.findFirst({ where: eq(projects.id, id) });
    return row ? this.toEntity(row) : null;
  }

  async findByWorkspaceAndSlug(
    workspaceId: string,
    slug: string,
  ): Promise<Project | null> {
    const row = await this.db.query.projects.findFirst({
      where: and(eq(projects.workspaceId, workspaceId), eq(projects.slug, slug)),
    });
    return row ? this.toEntity(row) : null;
  }

  async findByWorkspaceAndKey(workspaceId: string, key: string): Promise<Project | null> {
    const row = await this.db.query.projects.findFirst({
      where: and(eq(projects.workspaceId, workspaceId), eq(projects.key, key)),
    });
    return row ? this.toEntity(row) : null;
  }

  async listByWorkspace(workspaceId: string): Promise<Project[]> {
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId));
    return rows.map((r) => this.toEntity(r));
  }

  // SOLID: SRP — apenas aloca o próximo número via UPDATE ... RETURNING.
  // O Postgres garante atomicidade da operação dentro de uma única transação
  // implícita; o issue insert correspondente deve ser feito na mesma TX para
  // evitar gaps de número se a inserção falhar (CreateIssue use case faz isso).
  async allocateNextIssueNumber(projectId: string): Promise<number> {
    const result = await this.db.execute<{ next_issue_number: number }>(
      sql`UPDATE projects
          SET next_issue_number = next_issue_number + 1
          WHERE id = ${projectId}
          RETURNING (next_issue_number - 1) AS next_issue_number`,
    );
    const row = (result as unknown as Array<{ next_issue_number: number }>)[0];
    if (!row) {
      throw new Error(`Project ${projectId} not found during issue number allocation`);
    }
    return Number(row.next_issue_number);
  }

  private toEntity(row: typeof projects.$inferSelect): Project {
    return Project.fromPersistence({
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      slug: row.slug,
      key: row.key,
      description: row.description,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
