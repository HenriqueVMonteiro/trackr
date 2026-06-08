import {
  ok,
  err,
  type Result,
  type Clock,
  type IdGenerator,
  type EventBus,
  NotFoundError,
  ForbiddenError,
} from "@/shared";
import { ISSUE_DELETED, type IssueDeletedEvent } from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";

export interface DeleteIssueInput {
  actorId: string;
  issueId: string;
}

export type DeleteIssueError = NotFoundError | ForbiddenError;

export interface DeleteIssueDeps {
  repo: IssueRepository;
  clock: Clock;
  ids: IdGenerator;
  events: EventBus;
}

// SOLID: SRP — apenas remove a issue. Cascade de sub-tarefas, comentarios,
// labels e activity acontece via FK ON DELETE CASCADE no Postgres (definido
// em A3) — manter aqui sem a parte SQL.
export class DeleteIssue {
  constructor(private readonly deps: DeleteIssueDeps) {}

  async execute(input: DeleteIssueInput): Promise<Result<void, DeleteIssueError>> {
    const { repo, clock, ids, events } = this.deps;

    const issue = await repo.findById(input.issueId);
    if (!issue) return err(new NotFoundError("Issue", input.issueId));

    // Authz simples por agora: apenas o criador da issue pode deletar.
    // Em produção, isso deveria abrir para o owner do workspace. Tracked
    // como follow-up; a port WorkspaceRepository.findMembership cobre o caso
    // cross-module quando precisar.
    if (issue.createdBy !== input.actorId) {
      return err(
        new ForbiddenError("Only the issue creator can delete this issue", {
          issueId: input.issueId,
        }),
      );
    }

    await repo.delete(input.issueId);

    const event: IssueDeletedEvent = {
      id: ids.generate("evt"),
      type: ISSUE_DELETED,
      aggregateType: "issue",
      aggregateId: issue.id,
      payload: {
        issueId: issue.id,
        projectId: issue.projectId,
        number: issue.number,
        actorId: input.actorId,
      },
      occurredAt: clock.now(),
    };
    await events.publish(event);

    return ok(undefined);
  }
}
