export type { IssueSearcher } from "./ports/IssueSearcher";
export type { Cache } from "./ports/Cache";

export {
  rankingFor,
  RelevanceRanking,
  DateRanking,
  PriorityRanking,
  type RankingStrategy,
} from "./ranking";
