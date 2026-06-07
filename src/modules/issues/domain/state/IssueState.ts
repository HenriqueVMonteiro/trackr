import { ok, err, type Result } from "@/shared/result";
import { InvalidTransitionError } from "@/shared/errors";
import type { IssueStatus } from "../IssueStatus";

// GoF: State (Gamma et al.) — cada estado é um objeto que conhece quais
// transições aceita. Substitui um switch/if gigante por polimorfismo.
//
// Permitem-se transições:
//   backlog    -> todo, canceled
//   todo       -> backlog, in_progress, canceled
//   in_progress-> todo, in_review, canceled
//   in_review  -> in_progress (rejeitado), done (requer approver), canceled
//   done       -> todo (reabertura)
//   canceled   -> (terminal)

export interface IssueStateContext {
  readonly approverId: string | null;
}

export interface IssueState {
  readonly name: IssueStatus;
  attempt(
    next: IssueStatus,
    ctx: IssueStateContext,
  ): Result<IssueStatus, InvalidTransitionError>;
}

export class BacklogState implements IssueState {
  readonly name: IssueStatus = "backlog";

  attempt(
    next: IssueStatus,
    _ctx: IssueStateContext,
  ): Result<IssueStatus, InvalidTransitionError> {
    if (next === "todo" || next === "canceled") return ok(next);
    return err(new InvalidTransitionError(this.name, next));
  }
}

export class TodoState implements IssueState {
  readonly name: IssueStatus = "todo";

  attempt(
    next: IssueStatus,
    _ctx: IssueStateContext,
  ): Result<IssueStatus, InvalidTransitionError> {
    if (next === "backlog" || next === "in_progress" || next === "canceled") return ok(next);
    return err(new InvalidTransitionError(this.name, next));
  }
}

export class InProgressState implements IssueState {
  readonly name: IssueStatus = "in_progress";

  attempt(
    next: IssueStatus,
    _ctx: IssueStateContext,
  ): Result<IssueStatus, InvalidTransitionError> {
    if (next === "todo" || next === "in_review" || next === "canceled") return ok(next);
    return err(new InvalidTransitionError(this.name, next));
  }
}

export class InReviewState implements IssueState {
  readonly name: IssueStatus = "in_review";

  attempt(
    next: IssueStatus,
    ctx: IssueStateContext,
  ): Result<IssueStatus, InvalidTransitionError> {
    if (next === "done") {
      if (!ctx.approverId) {
        return err(
          new InvalidTransitionError(this.name, next, { reason: "approver_required" }),
        );
      }
      return ok(next);
    }
    if (next === "in_progress" || next === "canceled") return ok(next);
    return err(new InvalidTransitionError(this.name, next));
  }
}

export class DoneState implements IssueState {
  readonly name: IssueStatus = "done";

  attempt(
    next: IssueStatus,
    _ctx: IssueStateContext,
  ): Result<IssueStatus, InvalidTransitionError> {
    if (next === "todo") return ok(next);
    return err(new InvalidTransitionError(this.name, next));
  }
}

export class CanceledState implements IssueState {
  readonly name: IssueStatus = "canceled";

  attempt(
    next: IssueStatus,
    _ctx: IssueStateContext,
  ): Result<IssueStatus, InvalidTransitionError> {
    return err(new InvalidTransitionError(this.name, next, { reason: "terminal_state" }));
  }
}
