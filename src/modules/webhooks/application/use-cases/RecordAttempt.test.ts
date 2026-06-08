import { describe, it, expect } from "vitest";

import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import { RecordAttempt } from "./RecordAttempt";
import type { DeliveryAttempt} from "../../domain";
import { WebhookEndpoint, WebhookDelivery, RetryPolicy } from "../../domain";
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

const setup = (maxAttempts = 2) => {
  const webhookRepo = new FakeWebhookRepo();
  const deliveryRepo = new FakeDeliveryRepo();

  const ep = WebhookEndpoint.create({
    id: "whk_0001",
    workspaceId: "wsp_0001",
    url: "https://example.com/hook",
    secret: "a-very-long-secret-value",
    retryPolicy: RetryPolicy.fixed(maxAttempts, 100),
    createdAt: at,
  });
  if (!ep.ok) throw new Error("seed endpoint");
  webhookRepo.saved.push(ep.value);

  const del = WebhookDelivery.create({
    id: "del_0001",
    endpointId: "whk_0001",
    eventType: "issue.created",
    payload: {},
    createdAt: at,
  });
  if (!del.ok) throw new Error("seed delivery");
  deliveryRepo.deliveries.push(del.value);

  const useCase = new RecordAttempt({
    webhookRepo,
    deliveryRepo,
    clock: new FrozenClock(at),
    ids: new SequentialIdGenerator(),
    events: new InMemoryEventBus(),
  });
  return { webhookRepo, deliveryRepo, useCase };
};

describe("RecordAttempt", () => {
  it("returns NotFoundError when the delivery does not exist", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({ deliveryId: "ghost", statusCode: 200 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("marks the delivery succeeded on a 2xx and records the attempt", async () => {
    const { deliveryRepo, useCase } = setup();
    const r = await useCase.execute({ deliveryId: "del_0001", statusCode: 200, responseBody: "ok" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.delivery.status).toBe("succeeded");
    expect(deliveryRepo.attempts).toHaveLength(1);
  });

  it("dead-letters the delivery once failures reach the policy's maxAttempts", async () => {
    const { useCase } = setup(2);
    const first = await useCase.execute({ deliveryId: "del_0001", statusCode: 500, error: "boom" });
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value.delivery.status).toBe("failed");

    const second = await useCase.execute({ deliveryId: "del_0001", statusCode: 500, error: "boom" });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value.delivery.status).toBe("dead_lettered");
  });
});
