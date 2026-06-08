import type { RankingKey } from "../../domain";
import type { RankingStrategy } from "./RankingStrategy";
import { RelevanceRanking } from "./RelevanceRanking";
import { DateRanking } from "./DateRanking";
import { PriorityRanking } from "./PriorityRanking";

export type { RankingStrategy } from "./RankingStrategy";
export { RelevanceRanking } from "./RelevanceRanking";
export { DateRanking } from "./DateRanking";
export { PriorityRanking } from "./PriorityRanking";

// GoF: Strategy + SOLID: OCP — mapeia a CHAVE (RankingKey) para o COMPORTAMENTO
// (estratégia concreta). Adicionar uma ordenação nova é um case novo aqui + uma
// classe; nenhum caller muda. O switch é exaustivo sobre a union RankingKey.
export function rankingFor(key: RankingKey): RankingStrategy {
  switch (key) {
    case "relevance":
      return new RelevanceRanking();
    case "date":
      return new DateRanking();
    case "priority":
      return new PriorityRanking();
  }
}
