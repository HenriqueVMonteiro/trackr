import type { Clock, IdGenerator } from "@/shared";
import {
  ImportIssues,
  DryRunImport,
  type IssueCreator,
} from "./application";

export type * from "./domain";
export type {
  IssueCreator,
  CreateIssueInput,
  CreateIssueResult,
  Parser,
  ParseFormat,
  ImportIssuesInput,
  ImportIssuesDeps,
  ImportResult,
  DryRunImportInput,
  IssueTemplateDefaults,
  NormalizedRow,
} from "./application";
export { CsvParser, JsonParser, parserFor, IssueTemplate } from "./application";

export interface ImportModuleDeps {
  issueCreator: IssueCreator;
  clock: Clock;
  ids: IdGenerator;
}

export interface ImportModule {
  importIssues: ImportIssues;
  dryRunImport: DryRunImport;
}

// Composition root do módulo import. A app liga issueCreator ao CreateIssue do
// módulo issues no bootstrap; o módulo import permanece desacoplado (DIP) e não
// possui schema de banco próprio (cria issues através da port).
export function createImportModule(deps: ImportModuleDeps): ImportModule {
  return {
    importIssues: new ImportIssues({
      issueCreator: deps.issueCreator,
      clock: deps.clock,
      ids: deps.ids,
    }),
    dryRunImport: new DryRunImport(),
  };
}
