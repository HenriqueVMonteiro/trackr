import { eq } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { timeEntries } from "@/infrastructure/db/schema";
import { TimeEntry } from "../domain";
import type { TimeEntryRepository } from "../application/ports/TimeEntryRepository";

// SOLID: DIP — concretiza a port TimeEntryRepository. Trocar de Drizzle por
// outro adapter (in-memory, Prisma, Supabase Data API) é trocar esta classe
// sem mexer nos use cases.

export class DrizzleTimeEntryRepository implements TimeEntryRepository {
  constructor(private readonly db: Database) {}

  async save(entry: TimeEntry): Promise<void> {
    const json = entry.toJSON();
    await this.db
      .insert(timeEntries)
      .values({
        id: json.id,
        issueId: json.issueId,
        userId: json.userId,
        startedAt: json.startedAt,
        endedAt: json.endedAt,
        durationSeconds: json.durationSeconds,
        description: json.description,
        createdAt: json.createdAt,
      })
      .onConflictDoUpdate({
        target: timeEntries.id,
        set: {
          startedAt: json.startedAt,
          endedAt: json.endedAt,
          durationSeconds: json.durationSeconds,
          description: json.description,
        },
      });
  }

  async findById(id: string): Promise<TimeEntry | null> {
    const row = await this.db.query.timeEntries.findFirst({
      where: eq(timeEntries.id, id),
    });
    return row ? this.rowToEntry(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  async listByIssue(issueId: string): Promise<TimeEntry[]> {
    const rows = await this.db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.issueId, issueId));
    return rows.map((r) => this.rowToEntry(r));
  }

  async listByUser(userId: string): Promise<TimeEntry[]> {
    const rows = await this.db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, userId));
    return rows.map((r) => this.rowToEntry(r));
  }

  private rowToEntry(row: typeof timeEntries.$inferSelect): TimeEntry {
    return TimeEntry.fromPersistence({
      id: row.id,
      issueId: row.issueId,
      userId: row.userId,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      durationSeconds: row.durationSeconds,
      description: row.description,
      createdAt: row.createdAt,
    });
  }
}
