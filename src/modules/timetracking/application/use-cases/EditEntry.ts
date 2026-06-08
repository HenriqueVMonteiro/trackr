import type { ValidationError } from "@/shared";
import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
} from "@/shared";
import { TimeEntry, TIME_ENTRY_EDITED, type TimeEntryEditedEvent } from "../../domain";
import type { TimeEntryRepository } from "../ports/TimeEntryRepository";

export interface EditEntryInput {
  id: string;
  startedAt?: Date;
  endedAt?: Date;
  description?: string | null;
}

export interface EditEntryOutput {
  entry: TimeEntry;
}

export type EditEntryError = ValidationError | NotFoundError;

export interface EditEntryDeps {
  repo: TimeEntryRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — só edita os campos mutáveis de um TimeEntry (período/descrição),
// re-derivando duração via a factory de domínio.
// SOLID: DIP — depende da port TimeEntryRepository.
export class EditEntry {
  constructor(private readonly deps: EditEntryDeps) {}

  async execute(input: EditEntryInput): Promise<Result<EditEntryOutput, EditEntryError>> {
    const { repo, clock, ids, events } = this.deps;

    const existing = await repo.findById(input.id);
    if (!existing) {
      return err(new NotFoundError("TimeEntry", input.id));
    }

    const startedAt = input.startedAt ?? existing.startedAt;
    const endedAt = input.endedAt ?? existing.endedAt;
    const description =
      input.description !== undefined ? input.description : existing.description;

    // Re-cria via factory para revalidar invariantes (endedAt > startedAt,
    // limite de descrição) e re-derivar durationSeconds.
    const updated = TimeEntry.create({
      id: existing.id,
      issueId: existing.issueId,
      userId: existing.userId,
      startedAt,
      endedAt,
      description,
      createdAt: existing.createdAt,
    });
    if (!updated.ok) return updated;

    await repo.save(updated.value);

    const event: TimeEntryEditedEvent = {
      id: ids.generate("evt"),
      type: TIME_ENTRY_EDITED,
      aggregateType: "time_entry",
      aggregateId: updated.value.id,
      payload: {
        timeEntryId: updated.value.id,
        issueId: updated.value.issueId,
        userId: updated.value.userId,
        durationSeconds: updated.value.durationSeconds,
      },
      occurredAt: clock.now(),
    };
    await events.publish(event);

    return ok({ entry: updated.value });
  }
}
