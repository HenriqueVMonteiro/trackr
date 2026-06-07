import type { Label } from "../../domain";

export interface LabelRepository {
  save(label: Label): Promise<void>;
  findById(id: string): Promise<Label | null>;
  findByProjectAndName(projectId: string, name: string): Promise<Label | null>;
  listByProject(projectId: string): Promise<Label[]>;
  delete(id: string): Promise<void>;
}
