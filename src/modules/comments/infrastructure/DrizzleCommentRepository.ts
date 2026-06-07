import { asc, eq } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { comments } from "@/infrastructure/db/schema";
import { Comment } from "../domain";
import type { CommentRepository } from "../application/ports/CommentRepository";

export class DrizzleCommentRepository implements CommentRepository {
  constructor(private readonly db: Database) {}

  async save(comment: Comment): Promise<void> {
    const j = comment.toJSON();
    await this.db
      .insert(comments)
      .values({
        id: j.id,
        issueId: j.issueId,
        authorId: j.authorId,
        body: j.body,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      })
      .onConflictDoUpdate({
        target: comments.id,
        set: { body: j.body, updatedAt: j.updatedAt },
      });
  }

  async findById(id: string): Promise<Comment | null> {
    const row = await this.db.query.comments.findFirst({ where: eq(comments.id, id) });
    return row ? this.toEntity(row) : null;
  }

  async listByIssue(issueId: string): Promise<Comment[]> {
    const rows = await this.db
      .select()
      .from(comments)
      .where(eq(comments.issueId, issueId))
      .orderBy(asc(comments.createdAt));
    return rows.map((r) => this.toEntity(r));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(comments).where(eq(comments.id, id));
  }

  private toEntity(row: typeof comments.$inferSelect): Comment {
    return Comment.fromPersistence({
      id: row.id,
      issueId: row.issueId,
      authorId: row.authorId,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
