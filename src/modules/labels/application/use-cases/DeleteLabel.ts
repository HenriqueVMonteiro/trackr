import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
} from "@/shared";
import { LABEL_DELETED, type LabelDeletedEvent } from "../../domain";
import type { LabelRepository } from "../ports/LabelRepository";

export interface DeleteLabelInput {
  actorId: string;
  labelId: string;
}

export interface DeleteLabelDeps {
  repo: LabelRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class DeleteLabel {
  constructor(private readonly deps: DeleteLabelDeps) {}

  async execute(input: DeleteLabelInput): Promise<Result<void, NotFoundError>> {
    const { repo, clock, ids, events } = this.deps;
    const label = await repo.findById(input.labelId);
    if (!label) return err(new NotFoundError("Label", input.labelId));

    await repo.delete(label.id);

    const event: LabelDeletedEvent = {
      id: ids.generate("evt"),
      type: LABEL_DELETED,
      aggregateType: "label",
      aggregateId: label.id,
      payload: {
        labelId: label.id,
        projectId: label.projectId,
        actorId: input.actorId,
      },
      occurredAt: clock.now(),
    };
    await events.publish(event);
    return ok(undefined);
  }
}
