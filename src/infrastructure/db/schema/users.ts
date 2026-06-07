import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Mirror of Supabase auth.users (id = auth.users.id). Synchronized via trigger
// installed in stint B1 (Agente B). Held here so Drizzle FKs can reference it.
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
