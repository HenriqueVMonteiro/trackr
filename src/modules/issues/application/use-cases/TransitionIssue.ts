import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  NotFoundError,
  type InvalidTransitionError,
} from "@/shared";
import {
  type Issue,
  type IssueStatus,
  ISSUE_TRANSITIONED,
  ActivitySnapshot,
  type IssueTransitionedEvent,
} from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";
import type { ActivityRepository } from "../ports/ActivityRepository";

export interface TransitionIssueInput {
  actorId: string;
  issueId: string;
  to: IssueStatus;
}

export type TransitionIssueError = NotFoundError | InvalidTransitionError;

export interface TransitionIssueDeps {
  repo: IssueRepository;
  activityRepo: ActivityRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class TransitionIssue {
  constructor(private readonly deps: TransitionIssueDeps) {}

  async execute(input: TransitionIssueInput): Promise<Result<Issue, TransitionIssueError>> {
    const { repo, activityRepo, clock, ids, events } = this.deps;

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

    // GoF: Memento — captura estado antes/depois para Activity Log.
    const snapshot = ActivitySnapshot.capture({
      id: ids.generate(ID_PREFIXES.activity),
      actorId: input.actorId,
      action: "transitioned",
      before: issue,
      after: transitioned.value,
      at: now,
    });
    await activityRepo.save(snapshot);

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
