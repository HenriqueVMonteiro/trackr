import { ok, err, type Result, NotFoundError, ForbiddenError } from "@/shared";
import type { Workspace } from "../../domain";
import type { WorkspaceRepository } from "../ports/WorkspaceRepository";

export interface GetWorkspaceInput {
  actorId: string;
  workspaceId: string;
}

export type GetWorkspaceError = NotFoundError | ForbiddenError;

// SOLID: SRP — apenas lê e checa permissão.
export class GetWorkspace {
  constructor(private readonly repo: WorkspaceRepository) {}

  async execute(
    input: GetWorkspaceInput,
  ): Promise<Result<Workspace, GetWorkspaceError>> {
    const workspace = await this.repo.findById(input.workspaceId);
    if (!workspace) return err(new NotFoundError("Workspace", input.workspaceId));

    const membership = await this.repo.findMembership(input.workspaceId, input.actorId);
    if (!membership) {
      return err(
        new ForbiddenError("Actor is not a member of this workspace", {
          workspaceId: input.workspaceId,
          actorId: input.actorId,
        }),
      );
    }
    return ok(workspace);
  }
}
