import { ok, type Result } from "@/shared";
import type { Project } from "../../domain";
import type { ProjectRepository } from "../ports/ProjectRepository";

export interface ListProjectsForWorkspaceInput {
  workspaceId: string;
}

export class ListProjectsForWorkspace {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(
    input: ListProjectsForWorkspaceInput,
  ): Promise<Result<Project[], never>> {
    const list = await this.repo.listByWorkspace(input.workspaceId);
    return ok(list);
  }
}
