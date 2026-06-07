import { and, asc, desc, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { issueLabels, issues } from "@/infrastructure/db/schema";
import { Issue, type IssueProps } from "../domain";
import type { IssueRepository } from "../application/ports/IssueRepository";
import type { IssueFilter, PageQuery, PageResult } from "../application/dto";

export class DrizzleIssueRepository implements IssueRepository {
  constructor(private readonly db: Database) {}

  async save(issue: Issue): Promise<void> {
    const j = issue.toJSON();
    await this.db
      .insert(issues)
      .values({
        id: j.id,
        projectId: j.projectId,
        number: j.number,
        title: j.title,
        description: j.description,
        status: j.status,
        priority: j.priority,
        assigneeId: j.assigneeId,
        approverId: j.approverId,
        parentId: j.parentId,
        createdBy: j.createdBy,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        closedAt: j.closedAt,
        canceledAt: j.canceledAt,
      })
      .onConflictDoUpdate({
        target: issues.id,
        set: {
          title: j.title,
          description: j.description,
          status: j.status,
          priority: j.priority,
          assigneeId: j.assigneeId,
          approverId: j.approverId,
          updatedAt: j.updatedAt,
          closedAt: j.closedAt,
          canceledAt: j.canceledAt,
        },
      });
  }

  async findById(id: string): Promise<Issue | null> {
    const row = await this.db.query.issues.findFirst({ where: eq(issues.id, id) });
    return row ? this.toEntity(row) : null;
  }

  async findByProjectAndNumber(projectId: string, number: number): Promise<Issue | null> {
    const row = await this.db.query.issues.findFirst({
      where: and(eq(issues.projectId, projectId), eq(issues.number, number)),
    });
    return row ? this.toEntity(row) : null;
  }

  async listByProject(
    projectId: string,
    filter: IssueFilter,
    page: PageQuery,
  ): Promise<PageResult<Issue>> {
    const conditions = [eq(issues.projectId, projectId)];
    if (filter.status && filter.status.length > 0) {
      conditions.push(inArray(issues.status, [...filter.status]));
    }
    if (filter.priority && filter.priority.length > 0) {
      conditions.push(inArray(issues.priority, [...filter.priority]));
    }
    if (filter.assigneeId) {
      conditions.push(eq(issues.assigneeId, filter.assigneeId));
    }
    if (filter.parentId === null) {
      conditions.push(isNull(issues.parentId));
    } else if (filter.parentId !== undefined) {
      conditions.push(eq(issues.parentId, filter.parentId));
    }

    // Cursor format: base64(`${updatedAtISO}|${id}`)
    if (page.cursor) {
      const decoded = Buffer.from(page.cursor, "base64").toString("utf-8");
      const [updatedAtStr, idStr] = decoded.split("|");
      if (updatedAtStr && idStr) {
        const updatedAt = new Date(updatedAtStr);
        const tieBreaker = or(
          lt(issues.updatedAt, updatedAt),
          and(eq(issues.updatedAt, updatedAt), gt(issues.id, idStr)),
        );
        if (tieBreaker) conditions.push(tieBreaker);
      }
    }

    const rows = await this.db
      .select()
      .from(issues)
      .where(and(...conditions))
      .orderBy(desc(issues.updatedAt), asc(issues.id))
      .limit(page.limit + 1);

    const items = rows.slice(0, page.limit).map((r) => this.toEntity(r));
    const last = rows[page.limit];
    const nextCursor = last
      ? Buffer.from(`${last.updatedAt.toISOString()}|${last.id}`).toString("base64")
      : null;
    return { items, nextCursor };
  }

  async listChildren(parentId: string): Promise<Issue[]> {
    const rows = await this.db.select().from(issues).where(eq(issues.parentId, parentId));
    return rows.map((r) => this.toEntity(r));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(issues).where(eq(issues.id, id));
  }

  async attachLabel(issueId: string, labelId: string): Promise<void> {
    await this.db
      .insert(issueLabels)
      .values({ issueId, labelId })
      .onConflictDoNothing();
  }

  async detachLabel(issueId: string, labelId: string): Promise<void> {
    await this.db
      .delete(issueLabels)
      .where(and(eq(issueLabels.issueId, issueId), eq(issueLabels.labelId, labelId)));
  }

  async listLabelIds(issueId: string): Promise<string[]> {
    const rows = await this.db
      .select({ labelId: issueLabels.labelId })
      .from(issueLabels)
      .where(eq(issueLabels.issueId, issueId));
    return rows.map((r) => r.labelId);
  }

  private toEntity(row: typeof issues.$inferSelect): Issue {
    const props: IssueProps = {
      id: row.id,
      projectId: row.projectId,
      number: row.number,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assigneeId,
      approverId: row.approverId,
      parentId: row.parentId,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      closedAt: row.closedAt,
      canceledAt: row.canceledAt,
    };
    return Issue.fromPersistence(props);
  }
}
