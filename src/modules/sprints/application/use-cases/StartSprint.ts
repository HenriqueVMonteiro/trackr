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
import { type Sprint, SPRINT_STARTED, type SprintStartedEvent } from "../../domain";
import type { SprintRepository } from "../ports/SprintRepository";

export interface StartSprintInput {
  sprintId: string;
}

export interface StartSprintOutput {
  sprint: Sprint;
}

export type StartSprintError = NotFoundError | InvalidTransitionError;

export interface StartSprintDeps {
  repo: SprintRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — apenas orquestra a transição planned -> active.
// SOLID: DIP — depende de SprintRepository (port).
export class StartSprint {
  constructor(private readonly deps: StartSprintDeps) {}

  async execute(
    input: StartSprintInput,
  ): Promise<Result<StartSprintOutput, StartSprintError>> {
    const { repo, clock, ids, events } = this.deps;

    const sprint = await repo.findById(input.sprintId);
    if (!sprint) return err(new NotFoundError("Sprint", input.sprintId));

    const now = clock.now();
    const started = sprint.start(now);
    if (!started.ok) return started;

    await repo.save(started.value);

    const event: SprintStartedEvent = {
      id: ids.generate("evt"),
      type: SPRINT_STARTED,
      aggregateType: "sprint",
      aggregateId: started.value.id,
      payload: {
        sprintId: started.value.id,
        workspaceId: started.value.workspaceId,
        startedAt: now,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ sprint: started.value });
  }
}
