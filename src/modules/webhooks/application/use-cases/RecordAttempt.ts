import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  NotFoundError,
} from "@/shared";
import type {
  WebhookDelivery} from "../../domain";
import {
  DeliveryAttempt,
  WEBHOOK_DELIVERY_ATTEMPTED,
  type DeliveryAttemptedEvent,
} from "../../domain";
import type { WebhookRepository } from "../ports/WebhookRepository";
import type { DeliveryRepository } from "../ports/DeliveryRepository";

export interface RecordAttemptInput {
  deliveryId: string;
  statusCode?: number;
  responseBody?: string;
  error?: string;
}

export interface RecordAttemptOutput {
  delivery: WebhookDelivery;
}

export type RecordAttemptError = NotFoundError;

export interface RecordAttemptDeps {
  webhookRepo: WebhookRepository;
  deliveryRepo: DeliveryRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — persiste o resultado de UMA tentativa de entrega (vinda do worker
// no B3) e avança o status do delivery (succeeded / failed / dead_lettered).
// SOLID: DIP — depende das ports. A entrega HTTP em si é responsabilidade do B3.
export class RecordAttempt {
  constructor(private readonly deps: RecordAttemptDeps) {}

  async execute(input: RecordAttemptInput): Promise<Result<RecordAttemptOutput, RecordAttemptError>> {
    const { webhookRepo, deliveryRepo, clock, ids, events } = this.deps;

    const delivery = await deliveryRepo.findById(input.deliveryId);
    if (!delivery) {
      return err(new NotFoundError("WebhookDelivery", input.deliveryId));
    }
    const endpoint = await webhookRepo.findById(delivery.endpointId);
    if (!endpoint) {
      return err(new NotFoundError("WebhookEndpoint", delivery.endpointId));
    }

    const now = clock.now();

    const attempt = DeliveryAttempt.create({
      id: ids.generate(ID_PREFIXES.attempt),
      deliveryId: delivery.id,
      statusCode: input.statusCode ?? null,
      responseBody: input.responseBody ?? null,
      error: input.error ?? null,
      attemptedAt: now,
    });
    await deliveryRepo.recordAttempt(attempt);

    const updated = attempt.succeeded
      ? delivery.recordSuccess(now)
      : delivery.recordFailure(
          input.error ?? `HTTP ${input.statusCode ?? "error"}`,
          now,
          endpoint.retryPolicy.maxAttempts,
        );
    await deliveryRepo.save(updated);

    const event: DeliveryAttemptedEvent = {
      id: ids.generate("evt"),
      type: WEBHOOK_DELIVERY_ATTEMPTED,
      aggregateType: "webhook_delivery",
      aggregateId: updated.id,
      payload: {
        deliveryId: updated.id,
        endpointId: endpoint.id,
        attemptCount: updated.attemptCount,
        status: updated.status,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ delivery: updated });
  }
}
