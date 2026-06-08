import type { Clock, IdGenerator, EventBus } from "@/shared";
import type { Database } from "@/infrastructure/db/client";
import { DrizzleWebhookRepository } from "./infrastructure/DrizzleWebhookRepository";
import { DrizzleDeliveryRepository } from "./infrastructure/DrizzleDeliveryRepository";
import { InMemoryDeliveryQueue } from "./infrastructure/InMemoryDeliveryQueue";
import {
  CreateEndpoint,
  ListEndpoints,
  DeleteEndpoint,
  EnqueueDelivery,
  RecordAttempt,
  type WebhookRepository,
  type DeliveryRepository,
  type DeliveryQueue,
} from "./application";

export type * from "./domain";
export type {
  WebhookRepository,
  DeliveryRepository,
  DeliveryQueue,
  CreateEndpointInput,
  CreateEndpointOutput,
  CreateEndpointError,
  ListEndpointsInput,
  DeleteEndpointInput,
  DeleteEndpointError,
  EnqueueDeliveryInput,
  EnqueueDeliveryOutput,
  EnqueueDeliveryError,
  RecordAttemptInput,
  RecordAttemptOutput,
  RecordAttemptError,
} from "./application";

export interface WebhooksModuleDeps {
  db: Database;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
  // Opcional: o adapter BullMQ entra no B3. Default = fila in-memory (placeholder).
  queue?: DeliveryQueue;
}

export interface WebhooksModule {
  createEndpoint: CreateEndpoint;
  listEndpoints: ListEndpoints;
  deleteEndpoint: DeleteEndpoint;
  enqueueDelivery: EnqueueDelivery;
  recordAttempt: RecordAttempt;
  webhookRepository: WebhookRepository;
  deliveryRepository: DeliveryRepository;
  queue: DeliveryQueue;
}

// GoF: Factory (composição) / SOLID: DIP — liga adapters concretos aos use cases
// num único lugar. Sem singleton global.
export function createWebhooksModule(deps: WebhooksModuleDeps): WebhooksModule {
  const webhookRepo = new DrizzleWebhookRepository(deps.db);
  const deliveryRepo = new DrizzleDeliveryRepository(deps.db);
  const queue = deps.queue ?? new InMemoryDeliveryQueue();

  return {
    createEndpoint: new CreateEndpoint({
      repo: webhookRepo,
      clock: deps.clock,
      ids: deps.ids,
      events: deps.events,
    }),
    listEndpoints: new ListEndpoints(webhookRepo),
    deleteEndpoint: new DeleteEndpoint({
      repo: webhookRepo,
      clock: deps.clock,
      ids: deps.ids,
      events: deps.events,
    }),
    enqueueDelivery: new EnqueueDelivery({
      webhookRepo,
      deliveryRepo,
      queue,
      clock: deps.clock,
      ids: deps.ids,
      events: deps.events,
    }),
    recordAttempt: new RecordAttempt({
      webhookRepo,
      deliveryRepo,
      clock: deps.clock,
      ids: deps.ids,
      events: deps.events,
    }),
    webhookRepository: webhookRepo,
    deliveryRepository: deliveryRepo,
    queue,
  };
}
