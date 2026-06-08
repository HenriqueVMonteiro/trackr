import type { RankingKey, SearchHit } from "../../domain";

// GoF: Strategy + SOLID: OCP — cada algoritmo de ordenação dos hits é uma
// estratégia concreta intercambiável. Adicionar uma ordenação nova é uma classe
// nova + um case no seletor (rankingFor); nenhum caller existente muda.
//
// Contrato: sort() é PURO — retorna um NOVO array ordenado e nunca muta a entrada.
export interface RankingStrategy {
  readonly key: RankingKey;
  sort(hits: SearchHit[]): SearchHit[];
}
