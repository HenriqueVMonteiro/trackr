import type { Cache } from "../application/ports/Cache";
import type { IssueSearcher } from "../application/ports/IssueSearcher";
import type { SearchQuery, SearchResult } from "../domain";

// GoF: Decorator — adiciona cache em torno de QUALQUER IssueSearcher sem que o
// inner saiba. Implementa a mesma port (IssueSearcher), então é transparente para
// os callers: o módulo pode ou não embrulhar o searcher de FTS em cache.
export class CachedSearcher implements IssueSearcher {
  constructor(
    private readonly inner: IssueSearcher,
    private readonly cache: Cache,
    private readonly ttlSeconds: number,
  ) {}

  async search(query: SearchQuery): Promise<SearchResult> {
    const key = cacheKey(query);

    const cached = await this.cache.get<SearchResult>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await this.inner.search(query);
    await this.cache.set(key, result, this.ttlSeconds);
    return result;
  }
}

// Chave determinística a partir da query normalizada — campos em ordem fixa para
// que queries equivalentes gerem a mesma chave (limit/offset com defaults).
function cacheKey(query: SearchQuery): string {
  const normalized = {
    workspaceId: query.workspaceId,
    projectId: query.projectId ?? null,
    text: query.text,
    ranking: query.ranking,
    limit: query.limit ?? null,
    offset: query.offset ?? null,
  };
  return `search:${JSON.stringify(normalized)}`;
}
