import { ok, err, type Result, NotFoundError } from "@/shared";
import type { Project } from "../../domain";
import type { ProjectRepository } from "../ports/ProjectRepository";

export interface GetProjectInput {
  projectId: string;
}

export class GetProject {
  constructor(private readonly repo: ProjectRepository) {}

  async execute(input: GetProjectInput): Promise<Result<Project, NotFoundError>> {
    const p = await this.repo.findById(input.projectId);
    if (!p) return err(new NotFoundError("Project", input.projectId));
    return ok(p);
  }
}
