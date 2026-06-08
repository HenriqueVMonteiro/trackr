import type { RankingKey, SearchHit } from "../../domain";
import type { RankingStrategy } from "./RankingStrategy";

// GoF: Strategy (concreto) — ordena por score de relevância (ts_rank) desc.
export class RelevanceRanking implements RankingStrategy {
  readonly key: RankingKey = "relevance";

  sort(hits: SearchHit[]): SearchHit[] {
    return [...hits].sort((a, b) => b.score - a.score);
  }
}
