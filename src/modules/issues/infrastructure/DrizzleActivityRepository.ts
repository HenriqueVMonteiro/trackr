import { desc, eq } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { activity } from "@/infrastructure/db/schema";
import {
  ActivitySnapshot,
  type ActivitySnapshotProps,
  type IssueDiff,
} from "../domain/ActivitySnapshot";
import type { IssueProps } from "../domain/Issue";
import type { ActivityRepository } from "../application/ports/ActivityRepository";

// SOLID: DIP — concretiza a port ActivityRepository.

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class DrizzleActivityRepository implements ActivityRepository {
  constructor(private readonly db: Database) {}

  async save(snapshot: ActivitySnapshot): Promise<void> {
    const j = snapshot.toJSON();
    await this.db.insert(activity).values({
      id: j.id,
      issueId: j.issueId,
      actorId: j.actorId,
      action: j.action,
      snapshotBefore: j.before as object | null,
      snapshotAfter: j.after as object,
      diff: j.diff,
      createdAt: j.createdAt,
    });
  }

  async listByIssue(issueId: string, limit: number = DEFAULT_LIMIT): Promise<ActivitySnapshot[]> {
    const capped = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const rows = await this.db
      .select()
      .from(activity)
      .where(eq(activity.issueId, issueId))
      .orderBy(desc(activity.createdAt))
      .limit(capped);
    return rows.map((r) => this.toEntity(r));
  }

  private toEntity(row: typeof activity.$inferSelect): ActivitySnapshot {
    const props: ActivitySnapshotProps = {
      id: row.id,
      issueId: row.issueId,
      actorId: row.actorId,
      action: row.action,
      before: row.snapshotBefore as IssueProps | null,
      after: row.snapshotAfter as IssueProps,
      diff: row.diff as IssueDiff,
      createdAt: row.createdAt,
    };
    return ActivitySnapshot.fromPersistence(props);
  }
}
