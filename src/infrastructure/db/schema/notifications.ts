import {
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

// Notifications bounded context (B4/B5). Enums locais ao módulo.
export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "push",
  "in_app",
  "webhook",
]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    recipientIdx: index("notifications_recipient_idx").on(table.recipientId, table.createdAt),
  }),
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    channelsEnabled: text("channels_enabled")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.eventType] }),
  }),
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type NotificationPreferenceRow = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferenceRow = typeof notificationPreferences.$inferInsert;
