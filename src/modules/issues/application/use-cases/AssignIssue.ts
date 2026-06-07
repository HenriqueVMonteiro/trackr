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
  type Issue,
  ISSUE_ASSIGNED,
  type IssueAssignedEvent,
} from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";

export interface AssignIssueInput {
  actorId: string;
  issueId: string;
  assigneeId: string | null;
}

export interface AssignIssueDeps {
  repo: IssueRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class AssignIssue {
  constructor(private readonly deps: AssignIssueDeps) {}

  async execute(input: AssignIssueInput): Promise<Result<Issue, NotFoundError>> {
    const { repo, clock, ids, events } = this.deps;
    const issue = await repo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));

    const previous = issue.assigneeId;
    const now = clock.now();
    const updated = issue.assign(input.assigneeId, now);
    if (updated === issue) return ok(issue);

    await repo.save(updated);

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
