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
  ISSUE_ASSIGNED,
  ActivitySnapshot,
  type IssueAssignedEvent,
} from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";
import type { ActivityRepository } from "../ports/ActivityRepository";

export interface AssignIssueInput {
  actorId: string;
  issueId: string;
  assigneeId: string | null;
}

export interface AssignIssueDeps {
  repo: IssueRepository;
  activityRepo: ActivityRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class AssignIssue {
  constructor(private readonly deps: AssignIssueDeps) {}

  async execute(input: AssignIssueInput): Promise<Result<Issue, NotFoundError>> {
    const { repo, activityRepo, clock, ids, events } = this.deps;
    const issue = await repo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));

    const previous = issue.assigneeId;
    const now = clock.now();
    const updated = issue.assign(input.assigneeId, now);
    if (updated === issue) return ok(issue);

    await repo.save(updated);

    const snapshot = ActivitySnapshot.capture({
      id: ids.generate(ID_PREFIXES.activity),
      actorId: input.actorId,
      action: "assigned",
      before: issue,
      after: updated,
      at: now,
    });
    await activityRepo.save(snapshot);

    const event: IssueAssignedEvent = {
      id: ids.generate("evt"),
      type: ISSUE_ASSIGNED,
      aggregateType: "issue",
      aggregateId: issue.id,
      payload: {
        issueId: issue.id,
        projectId: issue.projectId,
        assigneeId: input.assigneeId,
        previousAssigneeId: previous,
        actorId: input.actorId,
      },
      occurredAt: now,
    };
    await events.publish(event);
    return ok(updated);
  }
}
