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

export interface SprintVelocity {
  readonly sprintId: string;
  readonly sprintName: string;
  readonly committedIssues: number;
  readonly completedIssues: number;
  // velocity is currently issue-count (no story points column on
  // sprintIssues in the B6 schema). If the schema gains a points column
  // later, ReportReader can return weighted totals here.
}

export interface BurndownPoint {
  readonly date: Date;
  readonly remainingIssues: number;
}

export interface BurndownReport {
  readonly sprintId: string;
  readonly sprintName: string;
  readonly totalIssues: number;
  readonly points: ReadonlyArray<BurndownPoint>;
}
