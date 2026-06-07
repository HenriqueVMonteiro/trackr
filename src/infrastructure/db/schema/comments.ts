import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { issues } from "./issues";
import { users } from "./users";

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issueIdx: index("comments_issue_idx").on(table.issueId, table.createdAt),
    authorIdx: index("comments_author_idx").on(table.authorId),
  }),
);

export type CommentRow = typeof comments.$inferSelect;
export type NewCommentRow = typeof comments.$inferInsert;
