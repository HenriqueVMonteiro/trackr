import { describe, it, expect } from "vitest";

import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import { EnqueueDelivery } from "./EnqueueDelivery";
import type { WebhookDelivery, DeliveryAttempt } from "../../domain";
import { WebhookEndpoint } from "../../domain";
import { InMemoryDeliveryQueue } from "../../infrastructure/InMemoryDeliveryQueue";
import type { WebhookRepository } from "../ports/WebhookRepository";
import type { DeliveryRepository } from "../ports/DeliveryRepository";

const at = new Date("2026-06-07T10:00:00Z");

class FakeWebhookRepo implements WebhookRepository {
  saved: WebhookEndpoint[] = [];
  async save(e: WebhookEndpoint): Promise<void> {
    this.saved.push(e);
  }
  async findById(id: string): Promise<WebhookEndpoint | null> {
    return this.saved.find((e) => e.id === id) ?? null;
  }
  async listByWorkspace(workspaceId: string): Promise<WebhookEndpoint[]> {
    return this.saved.filter((e) => e.workspaceId === workspaceId);
  }
  async delete(id: string): Promise<void> {
    this.saved = this.saved.filter((e) => e.id !== id);
  }
}

class FakeDeliveryRepo implements DeliveryRepository {
  deliveries: WebhookDelivery[] = [];
  attempts: DeliveryAttempt[] = [];
  async save(d: WebhookDelivery): Promise<void> {
    const i = this.deliveries.findIndex((x) => x.id === d.id);
    if (i >= 0) this.deliveries[i] = d;
    else this.deliveries.push(d);
  }
  async findById(id: string): Promise<WebhookDelivery | null> {
    return this.deliveries.find((d) => d.id === id) ?? null;
  }
  async listByEndpoint(endpointId: string): Promise<WebhookDelivery[]> {
    return this.deliveries.filter((d) => d.endpointId === endpointId);
  }
  async recordAttempt(a: DeliveryAttempt): Promise<void> {
    this.attempts.push(a);
  }
}

const seedEndpoint = (repo: FakeWebhookRepo, active = true): WebhookEndpoint => {
  const r = WebhookEndpoint.create({
    id: "whk_0001",
    workspaceId: "wsp_0001",
    url: "https://example.com/hook",
    secret: "a-very-long-secret-value",
    active,
    createdAt: at,
  });
  if (!r.ok) throw new Error("seed failed");
  repo.saved.push(r.value);
  return r.value;
};

const setup = () => {
  const webhookRepo = new FakeWebhookRepo();
  const deliveryRepo = new FakeDeliveryRepo();
  const queue = new InMemoryDeliveryQueue();
  const useCase = new EnqueueDelivery({
    webhookRepo,
    deliveryRepo,
    queue,
    clock: new FrozenClock(at),
    ids: new SequentialIdGenerator(),
    events: new InMemoryEventBus(),
  });
  return { webhookRepo, deliveryRepo, queue, useCase };
};

describe("EnqueueDelivery", () => {
  it("persists a pending delivery and pushes it to the queue", async () => {
    const ctx = setup();
    seedEndpoint(ctx.webhookRepo);
    const r = await ctx.useCase.execute({
      endpointId: "whk_0001",
      eventType: "issue.created",
      payload: { issueId: "iss_0001" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.delivery.status).toBe("pending");
      expect(ctx.deliveryRepo.deliveries).toHaveLength(1);
      expect(ctx.queue.pending()).toHaveLength(1);
    }
  });

  it("returns NotFoundError for an unknown endpoint", async () => {
    const ctx = setup();
    const r = await ctx.useCase.execute({ endpointId: "nope", eventType: "x", payload: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("returns ConflictError for an inactive endpoint", async () => {
    const ctx = setup();
    seedEndpoint(ctx.webhookRepo, false);
    const r = await ctx.useCase.execute({
      endpointId: "whk_0001",
      eventType: "issue.created",
      payload: {},
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("conflict");
    expect(ctx.queue.pending()).toHaveLength(0);
  });
});
