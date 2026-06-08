import {
  ok,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  type ValidationError,
} from "@/shared";
import {
  WebhookEndpoint,
  RetryPolicy,
  WEBHOOK_ENDPOINT_CREATED,
  type SignatureAlgo,
  type WebhookEndpointCreatedEvent,
} from "../../domain";
import type { WebhookRepository } from "../ports/WebhookRepository";

export interface CreateEndpointInput {
  workspaceId: string;
  url: string;
  secret: string;
  retryPolicy?: RetryPolicy;
  signatureAlgo?: SignatureAlgo;
}

export interface CreateEndpointOutput {
  endpoint: WebhookEndpoint;
}

export type CreateEndpointError = ValidationError;

export interface CreateEndpointDeps {
  repo: WebhookRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — uma razão para mudar: regras de criação de endpoint de webhook.
// SOLID: DIP — depende da port WebhookRepository, não do adapter concreto.
export class CreateEndpoint {
  constructor(private readonly deps: CreateEndpointDeps) {}

  async execute(
    input: CreateEndpointInput,
  ): Promise<Result<CreateEndpointOutput, CreateEndpointError>> {
    const { repo, clock, ids, events } = this.deps;
    const now = clock.now();

    const created = WebhookEndpoint.create({
      id: ids.generate(ID_PREFIXES.webhook),
      workspaceId: input.workspaceId,
      url: input.url,
      secret: input.secret,
      retryPolicy: input.retryPolicy ?? RetryPolicy.exponential(),
      ...(input.signatureAlgo ? { signatureAlgo: input.signatureAlgo } : {}),
      createdAt: now,
    });
    if (!created.ok) return created;

    await repo.save(created.value);

    // GoF: Observer — subscribers (notifications, audit) reagem desacoplados.
    const event: WebhookEndpointCreatedEvent = {
      id: ids.generate("evt"),
      type: WEBHOOK_ENDPOINT_CREATED,
      aggregateType: "webhook_endpoint",
      aggregateId: created.value.id,
      payload: {
        endpointId: created.value.id,
        workspaceId: created.value.workspaceId,
        url: created.value.url,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ endpoint: created.value });
  }
}
