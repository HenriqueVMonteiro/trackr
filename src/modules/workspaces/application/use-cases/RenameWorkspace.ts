import type {
  ValidationError} from "@/shared";
import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
  ForbiddenError
} from "@/shared";
import {
  type Workspace,
  WORKSPACE_RENAMED,
  type WorkspaceRenamedEvent,
} from "../../domain";
import type { WorkspaceRepository } from "../ports/WorkspaceRepository";

export interface RenameWorkspaceInput {
  actorId: string;
  workspaceId: string;
  newName: string;
}

export type RenameWorkspaceError = NotFoundError | ForbiddenError | ValidationError;

export interface RenameWorkspaceDeps {
  repo: WorkspaceRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class RenameWorkspace {
  constructor(private readonly deps: RenameWorkspaceDeps) {}

  async execute(
    input: RenameWorkspaceInput,
  ): Promise<Result<Workspace, RenameWorkspaceError>> {
    const { repo, clock, ids, events } = this.deps;

    const workspace = await repo.findById(input.workspaceId);
    if (!workspace) return err(new NotFoundError("Workspace", input.workspaceId));

    const membership = await repo.findMembership(input.workspaceId, input.actorId);
    if (!membership || !membership.isOwner()) {
      return err(
        new ForbiddenError("Only workspace owner can rename", {
          workspaceId: input.workspaceId,
        }),
      );
    }

    const renamed = workspace.rename(input.newName, clock.now());
    if (!renamed.ok) return renamed;

    if (renamed.value === workspace) {
      // no-op (same name)
      return ok(workspace);
    }

    await repo.save(renamed.value);

    const event: WorkspaceRenamedEvent = {
      id: ids.generate("evt"),
      type: WORKSPACE_RENAMED,
      aggregateType: "workspace",
      aggregateId: workspace.id,
      payload: {
        workspaceId: workspace.id,
        actorId: input.actorId,
        oldName: workspace.name,
        newName: renamed.value.name,
      },
      occurredAt: clock.now(),
    };
    await events.publish(event);

    return ok(renamed.value);
  }
}
