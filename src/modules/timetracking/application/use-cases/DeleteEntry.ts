import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
} from "@/shared";
import { TIME_ENTRY_DELETED, type TimeEntryDeletedEvent } from "../../domain";
import type { TimeEntryRepository } from "../ports/TimeEntryRepository";

export interface DeleteEntryInput {
  id: string;
}

export type DeleteEntryError = NotFoundError;

export interface DeleteEntryDeps {
  repo: TimeEntryRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — remove uma entrada de tempo existente.
// SOLID: DIP — depende da port TimeEntryRepository.
export class DeleteEntry {
  constructor(private readonly deps: DeleteEntryDeps) {}

  async execute(input: DeleteEntryInput): Promise<Result<void, DeleteEntryError>> {
    const { repo, clock, ids, events } = this.deps;

    const existing = await repo.findById(input.id);
    if (!existing) {
      return err(new NotFoundError("TimeEntry", input.id));
    }

    await repo.delete(existing.id);

    const event: TimeEntryDeletedEvent = {
      id: ids.generate("evt"),
      type: TIME_ENTRY_DELETED,
      aggregateType: "time_entry",
      aggregateId: existing.id,
      payload: {
        timeEntryId: existing.id,
        issueId: existing.issueId,
        userId: existing.userId,
      },
      occurredAt: clock.now(),
    };
    await events.publish(event);

    return ok(undefined);
  }
}
