import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  index,
  uniqueIndex,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";
import { labels } from "./labels";
import { issuePriorityEnum, issueStatusEnum } from "./enums";

export const issues = pgTable(
  "issues",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // sequential within a project; used together with project.key as "TRK-123"
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: issueStatusEnum("status").notNull().default("backlog"),
    priority: issuePriorityEnum("priority").notNull().default("none"),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    // approver required to transition from in_review -> done
    approverId: uuid("approver_id").references(() => users.id, { onDelete: "set null" }),
    // self-reference for sub-tasks (Composite pattern)
    parentId: text("parent_id").references((): AnyPgColumn => issues.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
  },
  (table) => ({
    projectNumberIdx: uniqueIndex("issues_project_number_idx").on(table.projectId, table.number),
    projectStatusIdx: index("issues_project_status_idx").on(table.projectId, table.status),
    assigneeIdx: index("issues_assignee_idx").on(table.assigneeId),
    parentIdx: index("issues_parent_idx").on(table.parentId),
    updatedIdx: index("issues_updated_idx").on(table.projectId, table.updatedAt),
  }),
);

// many-to-many issue <-> label
export const issueLabels = pgTable(
  "issue_labels",
  {
    issueId: text("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.issueId, table.labelId] }),
    labelIdx: index("issue_labels_label_idx").on(table.labelId),
  }),
);

export type IssueRow = typeof issues.$inferSelect;
export type NewIssueRow = typeof issues.$inferInsert;
export type IssueLabelRow = typeof issueLabels.$inferSelect;
export type NewIssueLabelRow = typeof issueLabels.$inferInsert;
