import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  ID_PREFIXES,
  type EventBus,
  ConflictError,
  ValidationError,
} from "@/shared";
import {
  Workspace,
  WorkspaceMember,
  WORKSPACE_CREATED,
  type WorkspaceCreatedEvent,
} from "../../domain";
import type { WorkspaceRepository } from "../ports/WorkspaceRepository";

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
  ownerId: string;
}

export interface CreateWorkspaceOutput {
  workspace: Workspace;
}

export type CreateWorkspaceError = ValidationError | ConflictError;

export interface CreateWorkspaceDeps {
  repo: WorkspaceRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — uma única razão para mudar: regras de criação de workspace.
// SOLID: DIP — depende de WorkspaceRepository (port), não de adapter concreto.
export class CreateWorkspace {
  constructor(private readonly deps: CreateWorkspaceDeps) {}

  async execute(
    input: CreateWorkspaceInput,
  ): Promise<Result<CreateWorkspaceOutput, CreateWorkspaceError>> {
    const { repo, clock, ids, events } = this.deps;

    const existing = await repo.findBySlug(input.slug);
    if (existing) {
      return err(
        new ConflictError(`Workspace slug '${input.slug}' is already taken`, {
          slug: input.slug,
        }),
      );
    }

    const now = clock.now();
    const workspaceId = ids.generate(ID_PREFIXES.workspace);

    const created = Workspace.create({
      id: workspaceId,
      name: input.name,
      slug: input.slug,
      ownerId: input.ownerId,
      createdAt: now,
      updatedAt: now,
    });
    if (!created.ok) return created;

    const ownerMember = WorkspaceMember.create({
      workspaceId,
      userId: input.ownerId,
      role: "owner",
      joinedAt: now,
    });

    await repo.saveWithOwner(created.value, ownerMember);

    // GoF: Observer — subscribers (activity log, notifications, webhooks)
    // reagem desacoplados deste use case.
    const event: WorkspaceCreatedEvent = {
      id: ids.generate("evt"),
      type: WORKSPACE_CREATED,
      aggregateType: "workspace",
      aggregateId: workspaceId,
      payload: {
        workspaceId,
        ownerId: input.ownerId,
        name: created.value.name,
        slug: created.value.slug,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ workspace: created.value });
  }
}
