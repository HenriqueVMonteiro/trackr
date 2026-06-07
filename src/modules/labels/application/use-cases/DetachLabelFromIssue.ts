import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
} from "@/shared";
import {
  ISSUE_UNLABELED,
} from "@/modules/issues/domain/events";
import type { IssueLabeledEvent } from "@/modules/issues/domain/events";
import type { LabelRepository } from "../ports/LabelRepository";
import type { IssueRepository } from "@/modules/issues/application/ports/IssueRepository";

export interface DetachLabelFromIssueInput {
  actorId: string;
  issueId: string;
  labelId: string;
}

export interface DetachLabelFromIssueDeps {
  issueRepo: IssueRepository;
  labelRepo: LabelRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class DetachLabelFromIssue {
  constructor(private readonly deps: DetachLabelFromIssueDeps) {}

  async execute(
    input: DetachLabelFromIssueInput,
  ): Promise<Result<void, NotFoundError>> {
    const { issueRepo, labelRepo, clock, ids, events } = this.deps;
    const issue = await issueRepo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));
    const label = await labelRepo.findById(input.labelId);
    if (!label) return err(new NotFoundError("Label", input.labelId));

    await issueRepo.detachLabel(issue.id, label.id);

    const event: IssueLabeledEvent = {
      id: ids.generate("evt"),
      type: ISSUE_UNLABELED,
      aggregateType: "issue",
      aggregateId: issue.id,
      payload: {
        issueId: issue.id,
        projectId: issue.projectId,
        labelId: label.id,
        actorId: input.actorId,
      },
      occurredAt: clock.now(),
    };
    await events.publish(event);
    return ok(undefined);
  }
}
