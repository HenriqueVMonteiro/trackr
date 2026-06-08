import { ok, err, type Result, NotFoundError } from "@/shared";
import { buildIssueTree, type IssueTree } from "../../domain/IssueTree";
import type { Issue } from "../../domain";
import type { IssueRepository } from "../ports/IssueRepository";

export interface GetIssueTreeInput {
  issueId: string;
  maxDepth?: number;
}

// SOLID: SRP — só carrega e monta a árvore. As regras de profundidade limite
// (proteção contra árvores patológicas) ficam aqui pois são da camada de
// aplicação, não da entidade.
//
// GoF: Composite — devolve um IssueTree (Composite) que o caller percorre
// uniformemente (size, walk, progressPercent).
export class GetIssueTree {
  constructor(private readonly repo: IssueRepository) {}

  async execute(
    input: GetIssueTreeInput,
  ): Promise<Result<IssueTree, NotFoundError>> {
    const root = await this.repo.findById(input.issueId);
    if (!root) return err(new NotFoundError("Issue", input.issueId));

    const maxDepth = input.maxDepth ?? 10;
    const all = await this.collectDescendants(root.id, maxDepth);
    return ok(buildIssueTree(root, all));
  }

  // BFS por níveis — para a busca quando atinge o limite de profundidade,
  // evitando recursão patológica caso alguém tenha feito ciclo (não deveria,
  // mas defesa em profundidade).
  private async collectDescendants(
    rootId: string,
    maxDepth: number,
  ): Promise<Issue[]> {
    const collected: Issue[] = [];
    const seen = new Set<string>([rootId]);
    let currentLevel: string[] = [rootId];
    let depth = 0;
    while (currentLevel.length > 0 && depth < maxDepth) {
      const nextLevel: string[] = [];
      for (const parentId of currentLevel) {
        const children = await this.repo.listChildren(parentId);
        for (const c of children) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          collected.push(c);
          nextLevel.push(c.id);
        }
      }
      currentLevel = nextLevel;
      depth++;
    }
    return collected;
  }
}
