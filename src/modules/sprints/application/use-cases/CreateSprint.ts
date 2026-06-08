import {
  ok,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  type ValidationError,
} from "@/shared";
import { Sprint, SPRINT_CREATED, type SprintCreatedEvent } from "../../domain";
import type { SprintRepository } from "../ports/SprintRepository";

export interface CreateSprintInput {
  workspaceId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
}

export interface CreateSprintOutput {
  sprint: Sprint;
}

export type CreateSprintError = ValidationError;

export interface CreateSprintDeps {
  repo: SprintRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — uma única razão para mudar: regras de criação de sprint.
// SOLID: DIP — depende de SprintRepository (port), não de adapter concreto.
export class CreateSprint {
  constructor(private readonly deps: CreateSprintDeps) {}

  async execute(
    input: CreateSprintInput,
  ): Promise<Result<CreateSprintOutput, CreateSprintError>> {
    const { repo, clock, ids, events } = this.deps;

    const now = clock.now();
    const sprintId = ids.generate(ID_PREFIXES.sprint);

    const created = Sprint.create({
      id: sprintId,
      workspaceId: input.workspaceId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      capacity: input.capacity,
      createdAt: now,
    });
    if (!created.ok) return created;

    await repo.save(created.value);

    // GoF: Observer — subscribers (activity log, notifications) reagem
    // desacoplados deste use case.
    const event: SprintCreatedEvent = {
      id: ids.generate("evt"),
      type: SPRINT_CREATED,
      aggregateType: "sprint",
      aggregateId: sprintId,
      payload: {
        sprintId,
        workspaceId: created.value.workspaceId,
        name: created.value.name,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ sprint: created.value });
  }
}
