import type { WebhookEndpoint } from "../../domain/WebhookEndpoint";
import type { WebhookRepository } from "../ports/WebhookRepository";

export interface ListEndpointsInput {
  workspaceId: string;
}

// SOLID: SRP — listar endpoints de um workspace. Sem erro de negócio previsível,
// retorna o array direto (não Result).
export class ListEndpoints {
  constructor(private readonly repo: WebhookRepository) {}

  async execute(input: ListEndpointsInput): Promise<WebhookEndpoint[]> {
    return this.repo.listByWorkspace(input.workspaceId);
  }
}
