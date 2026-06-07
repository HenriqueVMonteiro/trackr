import type { IssueStatus } from "../../domain/IssueStatus";
import type { IssuePriority } from "../../domain/IssuePriority";

export interface IssueFilter {
  status?: ReadonlyArray<IssueStatus>;
  priority?: ReadonlyArray<IssuePriority>;
  assigneeId?: string;
  parentId?: string | null; // null = root issues only (no parent)
}

export interface PageQuery {
  cursor?: string;
  limit: number;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}
