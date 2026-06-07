import { ok, type Result } from "@/shared";
import type { Workspace } from "../../domain";
import type { WorkspaceRepository } from "../ports/WorkspaceRepository";

export interface ListWorkspacesForUserInput {
  userId: string;
}

// SOLID: SRP — só lê pelo userId.
export class ListWorkspacesForUser {
  constructor(private readonly repo: WorkspaceRepository) {}

  async execute(input: ListWorkspacesForUserInput): Promise<Result<Workspace[], never>> {
    const list = await this.repo.listByUserId(input.userId);
    return ok(list);
  }
}
