import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
  type InvalidTransitionError,
} from "@/shared";
import { type Sprint, SPRINT_CLOSED, type SprintClosedEvent } from "../../domain";
import type { SprintRepository } from "../ports/SprintRepository";

export interface CloseSprintInput {
  sprintId: string;
}

export interface CloseSprintOutput {
  sprint: Sprint;
}

export type CloseSprintError = NotFoundError | InvalidTransitionError;

export interface CloseSprintDeps {
  repo: SprintRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — apenas orquestra a transição active -> closed.
// SOLID: DIP — depende de SprintRepository (port).
export class CloseSprint {
  constructor(private readonly deps: CloseSprintDeps) {}

  async execute(
    input: CloseSprintInput,
  ): Promise<Result<CloseSprintOutput, CloseSprintError>> {
    const { repo, clock, ids, events } = this.deps;

    const sprint = await repo.findById(input.sprintId);
    if (!sprint) return err(new NotFoundError("Sprint", input.sprintId));

    const now = clock.now();
    const closed = sprint.close(now);
    if (!closed.ok) return closed;

    await repo.save(closed.value);

    const event: SprintClosedEvent = {
      id: ids.generate("evt"),
      type: SPRINT_CLOSED,
      aggregateType: "sprint",
      aggregateId: closed.value.id,
      payload: {
        sprintId: closed.value.id,
        workspaceId: closed.value.workspaceId,
        closedAt: now,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ sprint: closed.value });
  }
}
