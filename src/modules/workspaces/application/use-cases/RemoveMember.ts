import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/shared";
import { WORKSPACE_MEMBER_REMOVED, type MemberRemovedEvent } from "../../domain";
import type { WorkspaceRepository } from "../ports/WorkspaceRepository";

export interface RemoveMemberInput {
  actorId: string;
  workspaceId: string;
  userId: string;
}

export type RemoveMemberError = NotFoundError | ForbiddenError | ValidationError;

export interface RemoveMemberDeps {
  repo: WorkspaceRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class RemoveMember {
  constructor(private readonly deps: RemoveMemberDeps) {}

  async execute(input: RemoveMemberInput): Promise<Result<void, RemoveMemberError>> {
    const { repo, clock, ids, events } = this.deps;

    const workspace = await repo.findById(input.workspaceId);
    if (!workspace) return err(new NotFoundError("Workspace", input.workspaceId));

    const target = await repo.findMembership(input.workspaceId, input.userId);
    if (!target) return err(new NotFoundError("Membership"));

    // Owner cannot be removed (must transfer first — out of scope here)
    if (target.isOwner()) {
      return err(new ValidationError("Cannot remove workspace owner", { field: "userId" }));
    }

    const isSelf = input.actorId === input.userId;
    const actorMembership = await repo.findMembership(input.workspaceId, input.actorId);
    const isActorOwner = actorMembership?.isOwner() ?? false;

    if (!isSelf && !isActorOwner) {
      return err(
        new ForbiddenError("Only the owner or the user themself can remove a member"),
      );
    }

    await repo.removeMember(input.workspaceId, input.userId);

    const event: MemberRemovedEvent = {
      id: ids.generate("evt"),
      type: WORKSPACE_MEMBER_REMOVED,
      aggregateType: "workspace",
      aggregateId: input.workspaceId,
      payload: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        removedBy: input.actorId,
      },
      occurredAt: clock.now(),
    };
    await events.publish(event);

    return ok(undefined);
  }
}
