import type { ValidationError } from "@/shared";
import {
  ok,
  type Result,
  type Clock,
  type IdGenerator,
  ID_PREFIXES,
  type EventBus,
} from "@/shared";
import { TimeEntry, TIME_LOGGED, type TimeLoggedEvent } from "../../domain";
import type { TimeEntryRepository } from "../ports/TimeEntryRepository";

export interface LogTimeInput {
  issueId: string;
  userId: string;
  startedAt: Date;
  endedAt: Date;
  description?: string | null;
}

export interface LogTimeOutput {
  entry: TimeEntry;
}

export type LogTimeError = ValidationError;

export interface LogTimeDeps {
  repo: TimeEntryRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — uma única razão para mudar: regras de registro de tempo.
// SOLID: DIP — depende de TimeEntryRepository (port), não de adapter concreto.
export class LogTime {
  constructor(private readonly deps: LogTimeDeps) {}

  async execute(input: LogTimeInput): Promise<Result<LogTimeOutput, LogTimeError>> {
    const { repo, clock, ids, events } = this.deps;

    const now = clock.now();
    const timeEntryId = ids.generate(ID_PREFIXES.timeEntry);

    const created = TimeEntry.create({
      id: timeEntryId,
      issueId: input.issueId,
      userId: input.userId,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      description: input.description ?? null,
      createdAt: now,
    });
    if (!created.ok) return created;

    await repo.save(created.value);

    // GoF: Observer — subscribers (issue rollups, activity log) reagem
    // desacoplados deste use case.
    const event: TimeLoggedEvent = {
      id: ids.generate("evt"),
      type: TIME_LOGGED,
      aggregateType: "time_entry",
      aggregateId: timeEntryId,
      payload: {
        timeEntryId,
        issueId: created.value.issueId,
        userId: created.value.userId,
        durationSeconds: created.value.durationSeconds,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ entry: created.value });
  }
}
