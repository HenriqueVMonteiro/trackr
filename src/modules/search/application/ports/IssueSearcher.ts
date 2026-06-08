import type { SearchQuery, SearchResult } from "../../domain";

// SOLID: ISP — port read-only de busca, deliberadamente separada das ports de
// escrita/repositório (IssueWriter/Repository). Quem só pesquisa depende apenas
// disto; o adapter de FTS implementa só esta operação.
export interface IssueSearcher {
  search(query: SearchQuery): Promise<SearchResult>;
}
