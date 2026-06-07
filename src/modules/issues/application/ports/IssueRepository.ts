import type { Issue } from "../../domain";
import type { IssueFilter, PageQuery, PageResult } from "../dto";

// SOLID: ISP — IssueRepository carrega read + write porque ambos andam juntos
// na maioria dos use cases. Para queries especializadas (busca por full-text
// em B7) o Agente B define IssueSearcher separado, demonstrando ISP onde
// existe ganho real (read-only com regras de ranking diferentes).
//
// SOLID: DIP — use cases dependem desta interface; DrizzleIssueRepository
// é injetado no bootstrap.

export interface IssueRepository {
  // reads
  findById(id: string): Promise<Issue | null>;
  findByProjectAndNumber(projectId: string, number: number): Promise<Issue | null>;
  listByProject(
    projectId: string,
    filter: IssueFilter,
    page: PageQuery,
  ): Promise<PageResult<Issue>>;
  listChildren(parentId: string): Promise<Issue[]>;

  // writes
  save(issue: Issue): Promise<void>;
  delete(id: string): Promise<void>;

  // labels (m:n)
  attachLabel(issueId: string, labelId: string): Promise<void>;
  detachLabel(issueId: string, labelId: string): Promise<void>;
  listLabelIds(issueId: string): Promise<string[]>;
}
