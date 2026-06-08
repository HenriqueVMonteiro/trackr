import type {
  CycleTimeReport,
  StatusDistribution,
  ThroughputBucket,
} from "../../domain";

// SOLID: DIP — use cases dependem deste port; DrizzleReportReader é o adapter.
// SOLID: ISP — port estritamente read-only (sem write methods),
// alinhado com a separação de responsabilidade que o módulo reports tem em
// relação a issues (módulo de outro bounded context).
//
// As views em drizzle/sql/views/ documentam a forma das queries; o adapter
// roda agregações diretas hoje e pode ser promovido a materialized views
// quando o volume justificar (estratégia explícita no README do módulo).

export interface ReportReader {
  // Throughput: contagem semanal de issues que entraram em done/canceled.
  // Janela e timezone calculados a partir de `from` (inclusive) ate `to`
  // (exclusivo). Devolve buckets ordenados por semana ascendente.
  getProjectThroughput(input: {
    projectId: string;
    from: Date;
    to: Date;
  }): Promise<ThroughputBucket[]>;

  // Cycle time: estatisticas de tempo de vida (createdAt -> closedAt) das
  // issues ja resolvidas no projeto. p50/p90 calculados em SQL via
  // PERCENTILE_CONT para evitar trazer todas as linhas para o app.
  getProjectCycleTime(input: { projectId: string }): Promise<CycleTimeReport>;

  // Distribuicao por status — contagem por status no instante atual.
  getProjectStatusDistribution(input: {
    projectId: string;
  }): Promise<StatusDistribution>;
}
