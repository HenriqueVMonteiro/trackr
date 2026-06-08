import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { issues } from "./issues";

export const sprintStatusEnum = pgEnum("sprint_status", ["planned", "active", "closed"]);

export const sprints = pgTable(
  "sprints",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: sprintStatusEnum("status").notNull().default("planned"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    capacity: integer("capacity").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("sprints_workspace_idx").on(table.workspaceId),
  }),
);

// many-to-many sprint <-> issue (sprint membership)
export const sprintIssues = pgTable(
  "sprint_issues",
  {
    sprintId: text("sprint_id")
      .notNull()
      .references(() => sprints.id, { onDelete: "cascade" }),
    issueId: text("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sprintId, table.issueId] }),
    issueIdx: index("sprint_issues_issue_idx").on(table.issueId),
  }),
);

export type SprintRow = typeof sprints.$inferSelect;
export type NewSprintRow = typeof sprints.$inferInsert;
export type SprintIssueRow = typeof sprintIssues.$inferSelect;
export type NewSprintIssueRow = typeof sprintIssues.$inferInsert;
