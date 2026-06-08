import { pgTable, text, timestamp, uuid, integer, index } from "drizzle-orm/pg-core";
import { issues } from "./issues";
import { users } from "./users";

export const timeEntries = pgTable(
  "time_entries",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueIdx: index("time_entries_issue_idx").on(table.issueId),
    userIdx: index("time_entries_user_idx").on(table.userId),
  }),
);

export type TimeEntryRow = typeof timeEntries.$inferSelect;
export type NewTimeEntryRow = typeof timeEntries.$inferInsert;
