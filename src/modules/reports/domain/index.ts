// Lightweight read-models. Reports não tem entidades mutáveis — só projeções.

import type { IssueStatus } from "@/modules/issues/domain/IssueStatus";

export interface ThroughputBucket {
  readonly weekStartingAt: Date;
  readonly closedCount: number;
  readonly canceledCount: number;
}

export interface CycleTimeReport {
  readonly projectId: string;
  readonly sampleSize: number;
  readonly avgDays: number;
  readonly p50Days: number;
  readonly p90Days: number;
}

export interface StatusDistribution {
  readonly projectId: string;
  readonly counts: Readonly<Record<IssueStatus, number>>;
  readonly total: number;
}
