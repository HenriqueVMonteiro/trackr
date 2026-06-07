export type { LabelRepository } from "./ports/LabelRepository";
export {
  CreateLabel,
  type CreateLabelInput,
  type CreateLabelError,
  type CreateLabelDeps,
} from "./use-cases/CreateLabel";
export {
  DeleteLabel,
  type DeleteLabelInput,
  type DeleteLabelDeps,
} from "./use-cases/DeleteLabel";
export {
  ListLabelsForProject,
  type ListLabelsForProjectInput,
} from "./use-cases/ListLabelsForProject";
export {
  AttachLabelToIssue,
  type AttachLabelToIssueInput,
  type AttachLabelToIssueError,
  type AttachLabelToIssueDeps,
} from "./use-cases/AttachLabelToIssue";
export {
  DetachLabelFromIssue,
  type DetachLabelFromIssueInput,
  type DetachLabelFromIssueDeps,
} from "./use-cases/DetachLabelFromIssue";
