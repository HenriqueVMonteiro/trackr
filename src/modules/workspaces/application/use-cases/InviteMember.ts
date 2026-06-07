import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/shared";
import {
  WorkspaceMember,
  WORKSPACE_MEMBER_INVITED,
  type WorkspaceRole,
  type MemberInvitedEvent,
} from "../../domain";
import type { WorkspaceRepository } from "../ports/WorkspaceRepository";

export interface InviteMemberInput {
  actorId: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export type InviteMemberError = NotFoundError | ForbiddenError | ConflictError;

export interface InviteMemberDeps {
  repo: WorkspaceRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class InviteMember {
  constructor(private readonly deps: InviteMemberDeps) {}

  async execute(
    input: InviteMemberInput,
  ): Promise<Result<WorkspaceMember, InviteMemberError>> {
    const { repo, clock, ids, events } = this.deps;

    const workspace = await repo.findById(input.workspaceId);
    if (!workspace) return err(new NotFoundError("Workspace", input.workspaceId));

    const actorMembership = await repo.findMembership(input.workspaceId, input.actorId);
    if (!actorMembership || !actorMembership.isOwner()) {
      return err(new ForbiddenError("Only workspace owner can invite members"));
    }

    const existing = await repo.findMembership(input.workspaceId, input.userId);
    if (existing) {
      return err(
        new ConflictError("User is already a member of this workspace", {
          workspaceId: input.workspaceId,
          userId: input.userId,
        }),
      );
    }

    const now = clock.now();
    const member = WorkspaceMember.create({
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: input.role,
      joinedAt: now,
    });

    await repo.addMember(member);

    const event: MemberInvitedEvent = {
      id: ids.generate("evt"),
      type: WORKSPACE_MEMBER_INVITED,
      aggregateType: "workspace",
      aggregateId: input.workspaceId,
      payload: {
        workspaceId: input.workspaceId,
        userId: input.userId,
        role: input.role,
        invitedBy: input.actorId,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok(member);
  }
}
