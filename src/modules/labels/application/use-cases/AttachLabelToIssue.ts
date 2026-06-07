import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
  ValidationError,
} from "@/shared";
import {
  ISSUE_LABELED,
  type IssueLabeledEvent,
} from "@/modules/issues/domain/events";
import type { LabelRepository } from "../ports/LabelRepository";
import type { IssueRepository } from "@/modules/issues/application/ports/IssueRepository";

export interface AttachLabelToIssueInput {
  actorId: string;
  issueId: string;
  labelId: string;
}

export type AttachLabelToIssueError = NotFoundError | ValidationError;

export interface AttachLabelToIssueDeps {
  issueRepo: IssueRepository;
  labelRepo: LabelRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class AttachLabelToIssue {
  constructor(private readonly deps: AttachLabelToIssueDeps) {}

  async execute(
    input: AttachLabelToIssueInput,
  ): Promise<Result<void, AttachLabelToIssueError>> {
    const { issueRepo, labelRepo, clock, ids, events } = this.deps;
    const issue = await issueRepo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));
    const label = await labelRepo.findById(input.labelId);
    if (!label) return err(new NotFoundError("Label", input.labelId));
    if (label.projectId !== issue.projectId) {
      return err(
        new ValidationError("Label and Issue must belong to the same project", {
          field: "labelId",
        }),
      );
    }

    await issueRepo.attachLabel(issue.id, label.id);

    const event: IssueLabeledEvent = {
      id: ids.generate("evt"),
      type: ISSUE_LABELED,
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
