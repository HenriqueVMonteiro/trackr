import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

// Outbox pattern (ADR-0007): every state-changing use case inserts a row here
// in the same transaction. A separate relay worker reads rows where
// published_at IS NULL and forwards them to the in-memory EventBus, then marks
// them published. Guarantees at-least-once delivery even if Redis is down.
export const outbox = pgTable(
  "outbox",
  {
    id: text("id").primaryKey(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    unpublishedIdx: index("outbox_unpublished_idx").on(table.publishedAt, table.createdAt),
    aggregateIdx: index("outbox_aggregate_idx").on(table.aggregateType, table.aggregateId),
  }),
);

export type OutboxRow = typeof outbox.$inferSelect;
export type NewOutboxRow = typeof outbox.$inferInsert;
