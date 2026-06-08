import type { TimeEntry } from "../../domain";

// SOLID: DIP — use cases dependem desta port; o adapter concreto
// (DrizzleTimeEntryRepository) é injetado no bootstrap do módulo.

export interface TimeEntryRepository {
  save(entry: TimeEntry): Promise<void>;
  findById(id: string): Promise<TimeEntry | null>;
  delete(id: string): Promise<void>;
  listByIssue(issueId: string): Promise<TimeEntry[]>;
  listByUser(userId: string): Promise<TimeEntry[]>;
}
