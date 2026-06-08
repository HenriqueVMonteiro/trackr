import { describe, it, expect, vi } from "vitest";

import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import { CreateEndpoint } from "./CreateEndpoint";
import { RetryPolicy } from "../../domain";
import type { WebhookEndpoint } from "../../domain";
import type { WebhookRepository } from "../ports/WebhookRepository";

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

const setup = () => {
  const repo = new FakeWebhookRepo();
  const clock = new FrozenClock(new Date("2026-06-07T10:00:00Z"));
  const ids = new SequentialIdGenerator();
  const events = new InMemoryEventBus();
  return { repo, events, useCase: new CreateEndpoint({ repo, clock, ids, events }) };
};

describe("CreateEndpoint", () => {
  it("creates and persists an endpoint with the default exponential policy", async () => {
    const { repo, useCase } = setup();
    const r = await useCase.execute({
      workspaceId: "wsp_0001",
      url: "https://example.com/hook",
      secret: "a-very-long-secret-value",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.endpoint.retryPolicy).toEqual(RetryPolicy.exponential());
      expect(repo.saved).toHaveLength(1);
      expect(repo.saved[0]?.workspaceId).toBe("wsp_0001");
    }
  });

  it("publishes webhook.endpoint_created", async () => {
    const { events, useCase } = setup();
    const handler = vi.fn(async (_e: unknown): Promise<void> => undefined);
    events.subscribe("webhook.endpoint_created", handler);
    await useCase.execute({
      workspaceId: "wsp_0001",
      url: "https://example.com/hook",
      secret: "a-very-long-secret-value",
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid (non-https) URL with ValidationError", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({
      workspaceId: "wsp_0001",
      url: "http://insecure.example.com",
      secret: "a-very-long-secret-value",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("validation");
  });
});
