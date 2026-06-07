import { and, asc, eq } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { labels } from "@/infrastructure/db/schema";
import { Label } from "../domain";
import type { LabelRepository } from "../application/ports/LabelRepository";

export class DrizzleLabelRepository implements LabelRepository {
  constructor(private readonly db: Database) {}

  async save(label: Label): Promise<void> {
    const j = label.toJSON();
    await this.db
      .insert(labels)
      .values({
        id: j.id,
        projectId: j.projectId,
        name: j.name,
        color: j.color,
        createdAt: j.createdAt,
      })
      .onConflictDoUpdate({
        target: labels.id,
        set: { name: j.name, color: j.color },
      });
  }

  async findById(id: string): Promise<Label | null> {
    const row = await this.db.query.labels.findFirst({ where: eq(labels.id, id) });
    return row ? this.toEntity(row) : null;
  }

  async findByProjectAndName(projectId: string, name: string): Promise<Label | null> {
    const row = await this.db.query.labels.findFirst({
      where: and(eq(labels.projectId, projectId), eq(labels.name, name)),
    });
    return row ? this.toEntity(row) : null;
  }

  async listByProject(projectId: string): Promise<Label[]> {
    const rows = await this.db
      .select()
      .from(labels)
      .where(eq(labels.projectId, projectId))
      .orderBy(asc(labels.name));
    return rows.map((r) => this.toEntity(r));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(labels).where(eq(labels.id, id));
  }

  private toEntity(row: typeof labels.$inferSelect): Label {
    return Label.fromPersistence({
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      color: row.color,
      createdAt: row.createdAt,
    });
  }
}
