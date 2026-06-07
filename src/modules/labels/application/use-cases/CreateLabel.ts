import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  ConflictError,
  type ValidationError,
} from "@/shared";
import { Label, LABEL_CREATED, type LabelCreatedEvent } from "../../domain";
import type { LabelRepository } from "../ports/LabelRepository";

export interface CreateLabelInput {
  actorId: string;
  projectId: string;
  name: string;
  color: string;
}

export type CreateLabelError = ValidationError | ConflictError;

export interface CreateLabelDeps {
  repo: LabelRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class CreateLabel {
  constructor(private readonly deps: CreateLabelDeps) {}

  async execute(input: CreateLabelInput): Promise<Result<Label, CreateLabelError>> {
    const { repo, clock, ids, events } = this.deps;

    const dupe = await repo.findByProjectAndName(input.projectId, input.name.trim());
    if (dupe) {
      return err(
        new ConflictError("Label with this name already exists in the project", {
          projectId: input.projectId,
          name: input.name,
        }),
      );
    }

    const now = clock.now();
    const labelId = ids.generate(ID_PREFIXES.label);
    const created = Label.create({
      id: labelId,
      projectId: input.projectId,
      name: input.name,
      color: input.color,
      createdAt: now,
    });
    if (!created.ok) return created;

    await repo.save(created.value);

    const event: LabelCreatedEvent = {
      id: ids.generate("evt"),
      type: LABEL_CREATED,
      aggregateType: "label",
      aggregateId: labelId,
      payload: {
        labelId,
        projectId: input.projectId,
        name: created.value.name,
        color: created.value.color,
        actorId: input.actorId,
      },
      occurredAt: now,
    };
    await events.publish(event);
    return ok(created.value);
  }
}
