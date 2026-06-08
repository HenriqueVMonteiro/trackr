import type { Database } from "@/infrastructure/db/client";
import { PostgresFtsSearcher } from "./infrastructure/PostgresFtsSearcher";
import { CachedSearcher } from "./infrastructure/CachedSearcher";
import type { IssueSearcher, Cache } from "./application";

export type * from "./domain";
export type { IssueSearcher, Cache, RankingStrategy } from "./application";
export type { RankingKey, SearchQuery, SearchResult, SearchHit } from "./domain";
export { rankingFor } from "./application";

const DEFAULT_CACHE_TTL_SECONDS = 60;

export interface SearchModuleDeps {
  db: Database;
  cache?: Cache;
  cacheTtlSeconds?: number;
}

export interface SearchModule {
  searcher: IssueSearcher;
}

// Composition root do módulo de busca. Constrói o searcher de FTS sobre Postgres
// e, quando há um Cache, o embrulha num CachedSearcher (GoF: Decorator) —
// transparente para os callers, que só conhecem a port IssueSearcher.
export function createSearchModule(deps: SearchModuleDeps): SearchModule {
  const base = new PostgresFtsSearcher(deps.db);
  const searcher: IssueSearcher = deps.cache
    ? new CachedSearcher(base, deps.cache, deps.cacheTtlSeconds ?? DEFAULT_CACHE_TTL_SECONDS)
    : base;

  return { searcher };
}
