import { pgTable, text, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // human-friendly slug, unique within workspace
    slug: text("slug").notNull(),
    // short identifier used in issue numbers (e.g. "TRK" -> TRK-123)
    key: text("key").notNull(),
    description: text("description"),
    // monotonic counter for next issue number in this project; bumped under row lock
    nextIssueNumber: integer("next_issue_number").notNull().default(1),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceSlugIdx: uniqueIndex("projects_workspace_slug_idx").on(
      table.workspaceId,
      table.slug,
    ),
    workspaceKeyIdx: uniqueIndex("projects_workspace_key_idx").on(table.workspaceId, table.key),
    workspaceIdx: index("projects_workspace_idx").on(table.workspaceId),
  }),
);

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
