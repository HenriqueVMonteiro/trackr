import type { WebhookEndpoint } from "../../domain/WebhookEndpoint";

// SOLID: DIP — use cases dependem desta port; o adapter concreto
// (DrizzleWebhookRepository) é injetado no bootstrap do módulo.
export interface WebhookRepository {
  save(endpoint: WebhookEndpoint): Promise<void>;
  findById(id: string): Promise<WebhookEndpoint | null>;
  listByWorkspace(workspaceId: string): Promise<WebhookEndpoint[]>;
  delete(id: string): Promise<void>;
}
