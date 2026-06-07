import type { Issue } from "./Issue";

// GoF: Composite — Issue é tanto Leaf (issue isolada) quanto parte de
// composição (sub-tasks formam árvore). IssueTree envolve o nó raiz + filhos
// para expor operações uniformes sobre a árvore inteira.
//
// SOLID: SRP — IssueTree só agrega/percorre. Persistência fica em
// IssueRepository.listChildren; lógica de domínio (transição) fica em Issue.

export class IssueTree {
  constructor(
    public readonly root: Issue,
    public readonly children: ReadonlyArray<IssueTree>,
  ) {
    Object.freeze(this);
    Object.freeze(this.children);
  }

  // Número total de issues na árvore (incluindo a raiz).
  size(): number {
    let total = 1;
    for (const c of this.children) total += c.size();
    return total;
  }

  // Profundidade máxima (raiz = 0).
  depth(): number {
    if (this.children.length === 0) return 0;
    let max = 0;
    for (const c of this.children) {
      const d = c.depth() + 1;
      if (d > max) max = d;
    }
    return max;
  }

  // Issues em ordem pre-order (raiz primeiro, depois cada subárvore).
  flatten(): Issue[] {
    const out: Issue[] = [];
    this.walk((i) => out.push(i));
    return out;
  }

  // Visita todas as issues da árvore. depth = 0 na raiz.
  walk(visitor: (issue: Issue, depth: number) => void): void {
    const visit = (node: IssueTree, depth: number): void => {
      visitor(node.root, depth);
      for (const c of node.children) visit(c, depth + 1);
    };
    visit(this, 0);
  }

  // % de sub-tarefas resolvidas (status = done). A raiz não conta.
  // Se não há sub-tarefas, retorna 0 ou 100 dependendo do status da raiz.
  progressPercent(): number {
    if (this.children.length === 0) return this.root.status === "done" ? 100 : 0;
    let done = 0;
    let total = 0;
    const visit = (node: IssueTree): void => {
      total += 1;
      if (node.root.status === "done") done += 1;
      for (const c of node.children) visit(c);
    };
    for (const c of this.children) visit(c);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }
}

// Constrói IssueTree a partir de uma lista plana. O caller passa a raiz e
// a lista plana de descendentes carregados.
export function buildIssueTree(root: Issue, descendants: ReadonlyArray<Issue>): IssueTree {
  const byParent = new Map<string, Issue[]>();
  for (const i of descendants) {
    if (!i.parentId) continue;
    const arr = byParent.get(i.parentId);
    if (arr) {
      arr.push(i);
    } else {
      byParent.set(i.parentId, [i]);
    }
  }
  const build = (issue: Issue): IssueTree => {
    const kids = byParent.get(issue.id) ?? [];
    return new IssueTree(
      issue,
      kids.map(build),
    );
  };
  return build(root);
}
