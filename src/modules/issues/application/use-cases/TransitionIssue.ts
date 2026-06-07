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
import {
  type Issue,
  type IssueStatus,
  ISSUE_TRANSITIONED,
  type IssueTransitionedEvent,
} from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";

export interface TransitionIssueInput {
  actorId: string;
  issueId: string;
  to: IssueStatus;
}

export type TransitionIssueError = NotFoundError | InvalidTransitionError;

export interface TransitionIssueDeps {
  repo: IssueRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class TransitionIssue {
  constructor(private readonly deps: TransitionIssueDeps) {}

  async execute(input: TransitionIssueInput): Promise<Result<Issue, TransitionIssueError>> {
    const { repo, clock, ids, events } = this.deps;

    const issue = await repo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));

    const previousStatus = issue.status;
    const now = clock.now();
    const transitioned = issue.transitionTo(input.to, now);
    if (!transitioned.ok) return transitioned;

    if (transitioned.value === issue) {
      // no-op: status didn't change (shouldn't happen with current state machine)
      return ok(issue);
    }

    await repo.save(transitioned.value);

    const event: IssueTransitionedEvent = {
      id: ids.generate("evt"),
      type: ISSUE_TRANSITIONED,
      aggregateType: "issue",
      aggregateId: issue.id,
      payload: {
        issueId: issue.id,
        projectId: issue.projectId,
        from: previousStatus,
        to: input.to,
        actorId: input.actorId,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok(transitioned.value);
  }
}
