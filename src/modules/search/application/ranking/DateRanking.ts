import type { RankingKey, SearchHit } from "../../domain";
import type { RankingStrategy } from "./RankingStrategy";

// GoF: Strategy (concreto) — ordena pelo mais recente (updatedAt) desc.
export class DateRanking implements RankingStrategy {
  readonly key: RankingKey = "date";

  sort(hits: SearchHit[]): SearchHit[] {
    return [...hits].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}
