import { describe, it, expect, vi } from "vitest";

import { FrozenClock, SequentialIdGenerator, InMemoryEventBus } from "@/shared";
import { DeleteEndpoint } from "./DeleteEndpoint";
import { WebhookEndpoint } from "../../domain";
import type { WebhookRepository } from "../ports/WebhookRepository";

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

const seed = (repo: FakeWebhookRepo): void => {
  const r = WebhookEndpoint.create({
    id: "whk_0001",
    workspaceId: "wsp_0001",
    url: "https://example.com/hook",
    secret: "a-very-long-secret-value",
    createdAt: at,
  });
  if (!r.ok) throw new Error("seed failed");
  repo.saved.push(r.value);
};

const setup = () => {
  const repo = new FakeWebhookRepo();
  const events = new InMemoryEventBus();
  const useCase = new DeleteEndpoint({
    repo,
    clock: new FrozenClock(at),
    ids: new SequentialIdGenerator(),
    events,
  });
  return { repo, events, useCase };
};

describe("DeleteEndpoint", () => {
  it("returns NotFoundError for an unknown endpoint", async () => {
    const { useCase } = setup();
    const r = await useCase.execute({ id: "ghost" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("not_found");
  });

  it("deletes the endpoint and publishes webhook.endpoint_deleted", async () => {
    const { repo, events, useCase } = setup();
    seed(repo);
    const handler = vi.fn(async (_e: unknown): Promise<void> => undefined);
    events.subscribe("webhook.endpoint_deleted", handler);

    const r = await useCase.execute({ id: "whk_0001" });
    expect(r.ok).toBe(true);
    expect(repo.saved).toHaveLength(0);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
