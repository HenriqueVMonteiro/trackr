import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

// Webhooks bounded context (B2). Enum local ao módulo — não toca enums.ts (Agente A).
export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "in_progress",
  "succeeded",
  "failed",
  "dead_lettered",
]);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    // Secret usado para assinar o payload (HMAC no B3). Em produção seria
    // encriptado em repouso; mantido como texto aqui no escopo do trabalho.
    secret: text("secret").notNull(),
    // RetryPolicy desmembrada: "exponential" | "linear" | "fixed" + params (jsonb).
    retryPolicyType: text("retry_policy_type").notNull(),
    retryPolicyParams: jsonb("retry_policy_params")
      .$type<Record<string, number>>()
      .notNull(),
    signatureAlgo: text("signature_algo").notNull().default("hmac-sha256"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("webhook_endpoints_workspace_idx").on(table.workspaceId),
  }),
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: text("id").primaryKey(),
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: webhookDeliveryStatusEnum("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    endpointIdx: index("webhook_deliveries_endpoint_idx").on(table.endpointId),
    statusIdx: index("webhook_deliveries_status_idx").on(table.status, table.createdAt),
  }),
);

export const deliveryAttempts = pgTable(
  "delivery_attempts",
  {
    id: text("id").primaryKey(),
    deliveryId: text("delivery_id")
      .notNull()
      .references(() => webhookDeliveries.id, { onDelete: "cascade" }),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    error: text("error"),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    deliveryIdx: index("delivery_attempts_delivery_idx").on(
      table.deliveryId,
      table.attemptedAt,
    ),
  }),
);

export type WebhookEndpointRow = typeof webhookEndpoints.$inferSelect;
export type NewWebhookEndpointRow = typeof webhookEndpoints.$inferInsert;
export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDeliveryRow = typeof webhookDeliveries.$inferInsert;
export type DeliveryAttemptRow = typeof deliveryAttempts.$inferSelect;
export type NewDeliveryAttemptRow = typeof deliveryAttempts.$inferInsert;
