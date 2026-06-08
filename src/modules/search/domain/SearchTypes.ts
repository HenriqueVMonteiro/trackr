// Domain types for the search module. Pure data — no infra, no I/O.

// Chave que seleciona a estratégia de ordenação (GoF: Strategy).
export type RankingKey = "relevance" | "date" | "priority";

export interface SearchQuery {
  workspaceId: string;
  projectId?: string;
  text: string;
  ranking: RankingKey;
  limit?: number;
  offset?: number;
}

export interface SearchHit {
  issueId: string;
  projectId: string;
  title: string;
  snippet: string | null;
  score: number;
  status: string;
  priority: string;
  updatedAt: Date;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
}
