import { eq } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import { webhookDeliveries, deliveryAttempts } from "@/infrastructure/db/schema";
import type { DeliveryAttempt } from "../domain";
import { WebhookDelivery } from "../domain";
import type { DeliveryRepository } from "../application/ports/DeliveryRepository";

// SOLID: DIP — concretiza a port DeliveryRepository sobre Drizzle.
export class DrizzleDeliveryRepository implements DeliveryRepository {
  constructor(private readonly db: Database) {}

  async save(delivery: WebhookDelivery): Promise<void> {
    const j = delivery.toJSON();
    await this.db
      .insert(webhookDeliveries)
      .values({
        id: j.id,
        endpointId: j.endpointId,
        eventType: j.eventType,
        payload: j.payload,
        status: j.status,
        attemptCount: j.attemptCount,
        lastAttemptedAt: j.lastAttemptedAt,
        lastError: j.lastError,
        createdAt: j.createdAt,
      })
      .onConflictDoUpdate({
        target: webhookDeliveries.id,
        set: {
          status: j.status,
          attemptCount: j.attemptCount,
          lastAttemptedAt: j.lastAttemptedAt,
          lastError: j.lastError,
        },
      });
  }

  async findById(id: string): Promise<WebhookDelivery | null> {
    const row = await this.db.query.webhookDeliveries.findFirst({
      where: eq(webhookDeliveries.id, id),
    });
    return row ? this.toEntity(row) : null;
  }

  async listByEndpoint(endpointId: string): Promise<WebhookDelivery[]> {
    const rows = await this.db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpointId));
    return rows.map((r) => this.toEntity(r));
  }

  async recordAttempt(attempt: DeliveryAttempt): Promise<void> {
    const j = attempt.toJSON();
    await this.db.insert(deliveryAttempts).values({
      id: j.id,
      deliveryId: j.deliveryId,
      statusCode: j.statusCode,
      responseBody: j.responseBody,
      error: j.error,
      attemptedAt: j.attemptedAt,
    });
  }

  private toEntity(row: typeof webhookDeliveries.$inferSelect): WebhookDelivery {
    return WebhookDelivery.fromPersistence({
      id: row.id,
      endpointId: row.endpointId,
      eventType: row.eventType,
      payload: row.payload,
      status: row.status,
      attemptCount: row.attemptCount,
      lastAttemptedAt: row.lastAttemptedAt,
      lastError: row.lastError,
      createdAt: row.createdAt,
    });
  }
}
