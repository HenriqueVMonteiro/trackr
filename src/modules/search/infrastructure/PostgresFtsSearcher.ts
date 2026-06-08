import { sql } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import type { IssueSearcher } from "../application/ports/IssueSearcher";
import { rankingFor } from "../application/ranking";
import type { SearchHit, SearchQuery, SearchResult } from "../domain";

// SOLID: DIP — concretiza a port IssueSearcher usando Full-Text Search nativo
// do Postgres. Sem motor externo: websearch_to_tsquery interpreta o texto do
// usuário, to_tsvector(title + description) é o documento, ts_rank dá o score e
// ts_headline produz o snippet destacado. Multi-tenant via JOIN em projects
// filtrando por workspace_id (e project_id quando informado).
//
// A ordenação final é aplicada na aplicação (rankingFor(...).sort) — o SQL traz
// o conjunto relevante; a Strategy decide a apresentação (relevance/date/priority).

// Shape cru das linhas devolvidas por db.execute. Campos lidos por nome com
// coerção explícita — sem 'as unknown as'. A interseção com Record<string, unknown>
// satisfaz a constraint do generic execute<TRow extends Record<string, unknown>>.
type FtsRow = {
  issue_id: string;
  project_id: string;
  title: string;
  snippet: string | null;
  score: number | string;
  status: string;
  priority: string;
  updated_at: string | Date;
} & Record<string, unknown>;

const DEFAULT_LIMIT = 20;

export class PostgresFtsSearcher implements IssueSearcher {
  constructor(private readonly db: Database) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? 0;

    const projectFilter = query.projectId
      ? sql`AND p.id = ${query.projectId}`
      : sql``;

    const rows = await this.db.execute<FtsRow>(sql`
      SELECT
        i.id AS issue_id,
        i.project_id AS project_id,
        i.title AS title,
        ts_headline(
          'english',
          coalesce(i.title, '') || ' ' || coalesce(i.description, ''),
          websearch_to_tsquery('english', ${query.text})
        ) AS snippet,
        ts_rank(
          to_tsvector('english', coalesce(i.title, '') || ' ' || coalesce(i.description, '')),
          websearch_to_tsquery('english', ${query.text})
        ) AS score,
        i.status AS status,
        i.priority AS priority,
        i.updated_at AS updated_at
      FROM issues i
      JOIN projects p ON p.id = i.project_id
      WHERE p.workspace_id = ${query.workspaceId}
        ${projectFilter}
        AND to_tsvector('english', coalesce(i.title, '') || ' ' || coalesce(i.description, ''))
            @@ websearch_to_tsquery('english', ${query.text})
      ORDER BY score DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const hits: SearchHit[] = rows.map((r) => ({
      issueId: r.issue_id,
      projectId: r.project_id,
      title: r.title,
      snippet: r.snippet,
      score: Number(r.score),
      status: r.status,
      priority: r.priority,
      updatedAt: new Date(r.updated_at),
    }));

    const ranked = rankingFor(query.ranking).sort(hits);
    return { hits: ranked, total: ranked.length };
  }
}
