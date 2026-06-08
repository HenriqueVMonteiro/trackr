import type { RankingKey, SearchHit } from "../../domain";
import type { RankingStrategy } from "./RankingStrategy";

// Peso de cada prioridade: urgent > high > medium > low > none.
// Desconhecidos caem em 0 (tratados como "none") — robusto a dados sujos.
const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

function weightOf(priority: string): number {
  return PRIORITY_WEIGHT[priority] ?? 0;
}

// GoF: Strategy (concreto) — ordena por peso de prioridade desc,
// com desempate pelo score de relevância desc.
export class PriorityRanking implements RankingStrategy {
  readonly key: RankingKey = "priority";

  sort(hits: SearchHit[]): SearchHit[] {
    return [...hits].sort((a, b) => {
      const byPriority = weightOf(b.priority) - weightOf(a.priority);
      if (byPriority !== 0) return byPriority;
      return b.score - a.score;
    });
  }
}
