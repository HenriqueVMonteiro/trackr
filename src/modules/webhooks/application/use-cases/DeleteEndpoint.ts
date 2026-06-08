import {
  ok,
  err,
  type Result,
  type IdGenerator,
  type Clock,
  type EventBus,
  NotFoundError,
} from "@/shared";
import { WEBHOOK_ENDPOINT_DELETED, type WebhookEndpointDeletedEvent } from "../../domain";
import type { WebhookRepository } from "../ports/WebhookRepository";

export interface DeleteEndpointInput {
  id: string;
}

export type DeleteEndpointError = NotFoundError;

export interface DeleteEndpointDeps {
  repo: WebhookRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — remover um endpoint. SOLID: DIP — depende da port.
export class DeleteEndpoint {
  constructor(private readonly deps: DeleteEndpointDeps) {}

  async execute(input: DeleteEndpointInput): Promise<Result<void, DeleteEndpointError>> {
    const { repo, clock, ids, events } = this.deps;

    const endpoint = await repo.findById(input.id);
    if (!endpoint) {
      return err(new NotFoundError("WebhookEndpoint", input.id));
    }

    await repo.delete(input.id);

    const event: WebhookEndpointDeletedEvent = {
      id: ids.generate("evt"),
      type: WEBHOOK_ENDPOINT_DELETED,
      aggregateType: "webhook_endpoint",
      aggregateId: endpoint.id,
      payload: { endpointId: endpoint.id, workspaceId: endpoint.workspaceId },
      occurredAt: clock.now(),
    };
    await events.publish(event);

    return ok(undefined);
  }
}
