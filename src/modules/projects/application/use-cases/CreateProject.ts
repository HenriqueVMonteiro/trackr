import type {
  ValidationError} from "@/shared";
import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  ConflictError
} from "@/shared";
import { Project, PROJECT_CREATED, type ProjectCreatedEvent } from "../../domain";
import type { ProjectRepository } from "../ports/ProjectRepository";

export interface CreateProjectInput {
  actorId: string;
  workspaceId: string;
  name: string;
  slug: string;
  key: string;
  description?: string | null;
}

export interface CreateProjectOutput {
  project: Project;
}

export type CreateProjectError = ValidationError | ConflictError;

export interface CreateProjectDeps {
  repo: ProjectRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class CreateProject {
  constructor(private readonly deps: CreateProjectDeps) {}

  async execute(
    input: CreateProjectInput,
  ): Promise<Result<CreateProjectOutput, CreateProjectError>> {
    const { repo, clock, ids, events } = this.deps;

    const dupeSlug = await repo.findByWorkspaceAndSlug(input.workspaceId, input.slug);
    if (dupeSlug) {
      return err(
        new ConflictError("Project slug already used in this workspace", {
          workspaceId: input.workspaceId,
          slug: input.slug,
        }),
      );
    }
    const dupeKey = await repo.findByWorkspaceAndKey(input.workspaceId, input.key);
    if (dupeKey) {
      return err(
        new ConflictError("Project key already used in this workspace", {
          workspaceId: input.workspaceId,
          key: input.key,
        }),
      );
    }

    const now = clock.now();
    const projectId = ids.generate(ID_PREFIXES.project);

    const created = Project.create({
      id: projectId,
      workspaceId: input.workspaceId,
      name: input.name,
      slug: input.slug,
      key: input.key,
      description: input.description ?? null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    if (!created.ok) return created;

    await repo.save(created.value);

    const event: ProjectCreatedEvent = {
      id: ids.generate("evt"),
      type: PROJECT_CREATED,
      aggregateType: "project",
      aggregateId: projectId,
      payload: {
        projectId,
        workspaceId: input.workspaceId,
        name: created.value.name,
        slug: created.value.slug,
        key: created.value.key,
        createdBy: input.actorId,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ project: created.value });
  }
}
