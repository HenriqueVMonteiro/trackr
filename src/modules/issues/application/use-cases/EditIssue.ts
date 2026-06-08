import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  NotFoundError,
  type ValidationError,
} from "@/shared";
import {
  type Issue,
  ISSUE_EDITED,
  ActivitySnapshot,
  type IssueEditedEvent,
} from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";
import type { ActivityRepository } from "../ports/ActivityRepository";

export interface EditIssueInput {
  actorId: string;
  issueId: string;
  title?: string;
  description?: string | null;
}

export type EditIssueError = NotFoundError | ValidationError;

export interface EditIssueDeps {
  repo: IssueRepository;
  activityRepo: ActivityRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class EditIssue {
  constructor(private readonly deps: EditIssueDeps) {}

  async execute(input: EditIssueInput): Promise<Result<Issue, EditIssueError>> {
    const { repo, activityRepo, clock, ids, events } = this.deps;
    const issue = await repo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));

    const fields: { title?: string; description?: string | null } = {};
    if (input.title !== undefined) fields.title = input.title;
    if (input.description !== undefined) fields.description = input.description;

    const now = clock.now();
    const edited = issue.edit(fields, now);
    if (!edited.ok) return edited;
    if (edited.value === issue) return ok(issue);

    await repo.save(edited.value);

    const snapshot = ActivitySnapshot.capture({
      id: ids.generate(ID_PREFIXES.activity),
      actorId: input.actorId,
      action: "edited",
      before: issue,
      after: edited.value,
      at: now,
    });
    await activityRepo.save(snapshot);

    const changedFields: Array<"title" | "description"> = [];
    if (input.title !== undefined && input.title !== issue.title) changedFields.push("title");
    if (input.description !== undefined && input.description !== issue.description) {
      changedFields.push("description");
    }

    const event: IssueEditedEvent = {
      id: ids.generate("evt"),
      type: ISSUE_EDITED,
      aggregateType: "issue",
      aggregateId: issue.id,
      payload: {
        issueId: issue.id,
        projectId: issue.projectId,
        actorId: input.actorId,
        changedFields,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok(edited.value);
  }
}
