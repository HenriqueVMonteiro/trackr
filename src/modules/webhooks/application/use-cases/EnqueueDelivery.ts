import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  NotFoundError,
  ConflictError,
  type ValidationError,
} from "@/shared";
import {
  WebhookDelivery,
  WEBHOOK_DELIVERY_ENQUEUED,
  type DeliveryEnqueuedEvent,
} from "../../domain";
import type { WebhookRepository } from "../ports/WebhookRepository";
import type { DeliveryRepository } from "../ports/DeliveryRepository";
import type { DeliveryQueue } from "../ports/DeliveryQueue";

export interface EnqueueDeliveryInput {
  endpointId: string;
  eventType: string;
  payload: unknown;
}

export interface EnqueueDeliveryOutput {
  delivery: WebhookDelivery;
}

export type EnqueueDeliveryError = NotFoundError | ConflictError | ValidationError;

export interface EnqueueDeliveryDeps {
  webhookRepo: WebhookRepository;
  deliveryRepo: DeliveryRepository;
  queue: DeliveryQueue;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — registrar e enfileirar uma entrega para um endpoint.
// SOLID: DIP — depende das ports (repos + DeliveryQueue), nunca de BullMQ direto.
export class EnqueueDelivery {
  constructor(private readonly deps: EnqueueDeliveryDeps) {}

  async execute(
    input: EnqueueDeliveryInput,
  ): Promise<Result<EnqueueDeliveryOutput, EnqueueDeliveryError>> {
    const { webhookRepo, deliveryRepo, queue, clock, ids, events } = this.deps;

    const endpoint = await webhookRepo.findById(input.endpointId);
    if (!endpoint) {
      return err(new NotFoundError("WebhookEndpoint", input.endpointId));
    }
    if (!endpoint.active) {
      return err(
        new ConflictError("Cannot enqueue delivery for an inactive endpoint", {
          endpointId: endpoint.id,
        }),
      );
    }

    const now = clock.now();
    const created = WebhookDelivery.create({
      id: ids.generate(ID_PREFIXES.delivery),
      endpointId: endpoint.id,
      eventType: input.eventType,
      payload: input.payload,
      createdAt: now,
    });
    if (!created.ok) return created;

    await deliveryRepo.save(created.value);
    await queue.enqueue(created.value);

    const event: DeliveryEnqueuedEvent = {
      id: ids.generate("evt"),
      type: WEBHOOK_DELIVERY_ENQUEUED,
      aggregateType: "webhook_delivery",
      aggregateId: created.value.id,
      payload: {
        deliveryId: created.value.id,
        endpointId: endpoint.id,
        eventType: created.value.eventType,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ delivery: created.value });
  }
}
