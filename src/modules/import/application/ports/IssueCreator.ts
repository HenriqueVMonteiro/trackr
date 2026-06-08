import type { Result } from "@/shared";
import type { DomainError } from "@/shared";

// SOLID: DIP — o módulo import depende desta port, não do módulo issues.
// No bootstrap a app liga IssueCreator ao CreateIssue do módulo issues; assim
// import permanece desacoplado e testável (FakeIssueCreator).

export interface CreateIssueInput {
  projectId: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
}

export interface CreateIssueResult {
  issueId: string;
}

export interface IssueCreator {
  createIssue(input: CreateIssueInput): Promise<Result<CreateIssueResult, DomainError>>;
}
