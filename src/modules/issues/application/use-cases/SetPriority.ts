import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  NotFoundError,
} from "@/shared";
import {
  type Issue,
  type IssuePriority,
  ISSUE_PRIORITY_CHANGED,
  ActivitySnapshot,
  type IssuePriorityChangedEvent,
} from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";
import type { ActivityRepository } from "../ports/ActivityRepository";

export interface SetPriorityInput {
  actorId: string;
  issueId: string;
  priority: IssuePriority;
}

export interface SetPriorityDeps {
  repo: IssueRepository;
  activityRepo: ActivityRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class SetPriority {
  constructor(private readonly deps: SetPriorityDeps) {}

  async execute(input: SetPriorityInput): Promise<Result<Issue, NotFoundError>> {
    const { repo, activityRepo, clock, ids, events } = this.deps;
    const issue = await repo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));

    const previous = issue.priority;
    const now = clock.now();
    const updated = issue.setPriority(input.priority, now);
    if (updated === issue) return ok(issue);

    await repo.save(updated);

    const snapshot = ActivitySnapshot.capture({
      id: ids.generate(ID_PREFIXES.activity),
      actorId: input.actorId,
      action: "priority_changed",
      before: issue,
      after: updated,
      at: now,
    });
    await activityRepo.save(snapshot);

    const event: IssuePriorityChangedEvent = {
      id: ids.generate("evt"),
      type: ISSUE_PRIORITY_CHANGED,
      aggregateType: "issue",
      aggregateId: issue.id,
      payload: {
        issueId: issue.id,
        projectId: issue.projectId,
        from: previous,
        to: input.priority,
        actorId: input.actorId,
      },
      occurredAt: now,
    };
    await events.publish(event);
    return ok(updated);
  }
}
