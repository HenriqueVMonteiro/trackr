import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  ID_PREFIXES,
  NotFoundError,
  ValidationError,
} from "@/shared";
import {
  Issue,
  ISSUE_CREATED,
  type IssueCreatedEvent,
  type IssuePriority,
} from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";
import type { ProjectRepository } from "@/modules/projects/application/ports/ProjectRepository";

export interface CreateIssueInput {
  actorId: string;
  projectId: string;
  title: string;
  description?: string | null;
  priority?: IssuePriority;
  assigneeId?: string | null;
  parentId?: string | null;
}

export interface CreateIssueOutput {
  issue: Issue;
}

export type CreateIssueError = NotFoundError | ValidationError;

export interface CreateIssueDeps {
  issueRepo: IssueRepository;
  projectRepo: ProjectRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

export class CreateIssue {
  constructor(private readonly deps: CreateIssueDeps) {}

  async execute(
    input: CreateIssueInput,
  ): Promise<Result<CreateIssueOutput, CreateIssueError>> {
    const { issueRepo, projectRepo, clock, ids, events } = this.deps;

    const project = await projectRepo.findById(input.projectId);
    if (!project) return err(new NotFoundError("Project", input.projectId));

    if (input.parentId) {
      const parent = await issueRepo.findById(input.parentId);
      if (!parent) return err(new NotFoundError("Parent issue", input.parentId));
      if (parent.projectId !== input.projectId) {
        return err(
          new ValidationError("Parent issue must belong to the same project", {
            field: "parentId",
          }),
        );
      }
    }

    const number = await projectRepo.allocateNextIssueNumber(input.projectId);
    const now = clock.now();
    const issueId = ids.generate(ID_PREFIXES.issue);

    const issueResult = Issue.create({
      id: issueId,
      projectId: input.projectId,
      number,
      title: input.title,
      description: input.description ?? null,
      status: "backlog",
      priority: input.priority ?? "none",
      assigneeId: input.assigneeId ?? null,
      approverId: null,
      parentId: input.parentId ?? null,
      createdBy: input.actorId,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      canceledAt: null,
    });
    if (!issueResult.ok) return issueResult;

    await issueRepo.save(issueResult.value);

    const event: IssueCreatedEvent = {
      id: ids.generate("evt"),
      type: ISSUE_CREATED,
      aggregateType: "issue",
      aggregateId: issueId,
      payload: {
        issueId,
        projectId: input.projectId,
        number,
        title: issueResult.value.title,
        status: issueResult.value.status,
        priority: issueResult.value.priority,
        createdBy: input.actorId,
        parentId: input.parentId ?? null,
      },
      occurredAt: now,
    };
    await events.publish(event);

    return ok({ issue: issueResult.value });
  }
}
