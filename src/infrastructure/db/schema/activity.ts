import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { issues } from "./issues";
import { users } from "./users";

// Activity log = persisted Memento snapshots (GoF: Memento).
// snapshotBefore / snapshotAfter are full Issue states at the moment of change.
// diff is a precomputed structural diff used by the UI to render
// "Maria changed priority from Low to High".
export const activity = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    snapshotBefore: jsonb("snapshot_before"),
    snapshotAfter: jsonb("snapshot_after").notNull(),
    diff: jsonb("diff").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueIdx: index("activity_issue_idx").on(table.issueId, table.createdAt),
    actorIdx: index("activity_actor_idx").on(table.actorId),
  }),
);

export type ActivityRow = typeof activity.$inferSelect;
export type NewActivityRow = typeof activity.$inferInsert;
