import type { Result } from "@/shared/result";
import type { InvalidTransitionError } from "@/shared/errors";
import type { IssueStatus } from "../IssueStatus";
import {
  BacklogState,
  CanceledState,
  DoneState,
  InProgressState,
  InReviewState,
  TodoState,
  type IssueState,
  type IssueStateContext,
} from "./IssueState";

// GoF: State + um Registry singleton de instâncias.
// Reusamos as instâncias porque elas são puras (sem estado interno).
const STATES: Readonly<Record<IssueStatus, IssueState>> = Object.freeze({
  backlog: new BacklogState(),
  todo: new TodoState(),
  in_progress: new InProgressState(),
  in_review: new InReviewState(),
  done: new DoneState(),
  canceled: new CanceledState(),
});

// SOLID: SRP — IssueStateMachine só sabe sobre transições; nada mais.
//        Nenhuma operação de persistência, autorização ou eventos vive aqui.
export const IssueStateMachine = {
  of(status: IssueStatus): IssueState {
    return STATES[status];
  },

  canTransition(from: IssueStatus, to: IssueStatus, ctx: IssueStateContext): boolean {
    return STATES[from].attempt(to, ctx).ok;
  },

  transition(
    from: IssueStatus,
    to: IssueStatus,
    ctx: IssueStateContext,
  ): Result<IssueStatus, InvalidTransitionError> {
    return STATES[from].attempt(to, ctx);
  },
} as const;
