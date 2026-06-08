import { describe, it, expect } from "vitest";

import { ListEndpoints } from "./ListEndpoints";
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

const makeEndpoint = (id: string, workspaceId: string): WebhookEndpoint => {
  const r = WebhookEndpoint.create({
    id,
    workspaceId,
    url: "https://example.com/hook",
    secret: "a-very-long-secret-value",
    createdAt: at,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
};

describe("ListEndpoints", () => {
  it("returns an empty array when the workspace has no endpoints", async () => {
    const repo = new FakeWebhookRepo();
    const result = await new ListEndpoints(repo).execute({ workspaceId: "wsp_0001" });
    expect(result).toEqual([]);
  });

  it("returns only the endpoints of the requested workspace", async () => {
    const repo = new FakeWebhookRepo();
    repo.saved.push(makeEndpoint("whk_0001", "wsp_0001"));
    repo.saved.push(makeEndpoint("whk_0002", "wsp_0001"));
    repo.saved.push(makeEndpoint("whk_0003", "wsp_other"));

    const result = await new ListEndpoints(repo).execute({ workspaceId: "wsp_0001" });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id).sort()).toEqual(["whk_0001", "whk_0002"]);
  });
});
