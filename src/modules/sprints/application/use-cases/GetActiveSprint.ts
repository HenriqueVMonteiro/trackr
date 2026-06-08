import { ok, type Result } from "@/shared";
import type { Sprint } from "../../domain";
import type { SprintRepository } from "../ports/SprintRepository";

export interface GetActiveSprintInput {
  workspaceId: string;
}

// SOLID: SRP — apenas lê a sprint ativa de um workspace (ou null).
// SOLID: DIP — depende de SprintRepository (port).
export class GetActiveSprint {
  constructor(private readonly repo: SprintRepository) {}

  async execute(input: GetActiveSprintInput): Promise<Result<Sprint | null, never>> {
    const sprint = await this.repo.findActiveByWorkspace(input.workspaceId);
    return ok(sprint);
  }
}
