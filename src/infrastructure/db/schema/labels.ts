import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const labels = pgTable(
  "labels",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectNameIdx: uniqueIndex("labels_project_name_idx").on(table.projectId, table.name),
    projectIdx: index("labels_project_idx").on(table.projectId),
  }),
);

export type LabelRow = typeof labels.$inferSelect;
export type NewLabelRow = typeof labels.$inferInsert;
