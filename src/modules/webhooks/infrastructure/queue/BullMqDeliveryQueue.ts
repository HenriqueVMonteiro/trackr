import { Queue } from "bullmq";
import IORedis, { type Redis } from "ioredis";
import type { WebhookDelivery } from "../../domain";
import type { DeliveryQueue } from "../../application/ports/DeliveryQueue";

export const WEBHOOK_QUEUE_NAME = "webhook-deliveries";

export interface WebhookJobData {
  deliveryId: string;
  endpointId: string;
}

// Conexão ioredis para BullMQ. NOTA: BullMQ usa Redis TCP (rediss://...), não o
// endpoint REST do Upstash. `maxRetriesPerRequest: null` é exigido pelo Worker.
export function createRedisConnection(url: string): Redis {
  return new IORedis(url, { maxRetriesPerRequest: null });
}

// SOLID: DIP / LSP — adapter BullMQ da port DeliveryQueue, substituível pela
// InMemoryDeliveryQueue (B2) sem mudar os use cases (ADR-0006).
export class BullMqDeliveryQueue implements DeliveryQueue {
  private readonly queue: Queue<WebhookJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue<WebhookJobData>(WEBHOOK_QUEUE_NAME, { connection });
  }

  async enqueue(delivery: WebhookDelivery): Promise<void> {
    await this.queue.add(
      "deliver",
      { deliveryId: delivery.id, endpointId: delivery.endpointId },
      { jobId: delivery.id, removeOnComplete: true, removeOnFail: 1000 },
    );
  }

  // Re-enfileira para uma nova tentativa após `delayMs` (calculado pela
  // RetryStrategy do endpoint no worker).
  async enqueueRetry(delivery: WebhookDelivery, attemptNumber: number, delayMs: number): Promise<void> {
    await this.queue.add(
      "deliver",
      { deliveryId: delivery.id, endpointId: delivery.endpointId },
      { jobId: `${delivery.id}:r${attemptNumber}`, delay: delayMs, removeOnComplete: true, removeOnFail: 1000 },
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
