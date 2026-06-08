import { sql } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import type { ReportReader } from "../application/ports/ReportReader";
import type {
  CycleTimeReport,
  StatusDistribution,
  ThroughputBucket,
} from "../domain";
import type { IssueStatus } from "@/modules/issues/domain/IssueStatus";
import { ISSUE_STATUSES } from "@/modules/issues/domain/IssueStatus";

// SOLID: DIP — concretiza a port. Drizzle aqui é só motor de execução
// das aggregations; nada de query builder fluido — usamos SQL direto
// para garantir que PERCENTILE_CONT e date_trunc rodem nativos no Postgres.
//
// Estratégia: queries diretas em runtime. As views em drizzle/sql/views/
// documentam o shape "ideal" como materialized views para promoção em
// produção (refresh por cron worker) quando o volume justificar — hoje
// custo de refresh > custo de query direta.

type ThroughputRow = {
  week_starting_at: Date;
  closed_count: string | number;
  canceled_count: string | number;
} & Record<string, unknown>;

type CycleTimeRow = {
  sample_size: string | number;
  avg_days: string | number | null;
  p50_days: string | number | null;
  p90_days: string | number | null;
} & Record<string, unknown>;

type StatusRow = {
  status: IssueStatus;
  cnt: string | number;
} & Record<string, unknown>;

export class DrizzleReportReader implements ReportReader {
  constructor(private readonly db: Database) {}

  async getProjectThroughput(input: {
    projectId: string;
    from: Date;
    to: Date;
  }): Promise<ThroughputBucket[]> {
    const rows = (await this.db.execute<ThroughputRow>(sql`
      SELECT
        date_trunc('week', closed_at)::timestamptz AS week_starting_at,
        COUNT(*) FILTER (WHERE status = 'done') AS closed_count,
        COUNT(*) FILTER (WHERE status = 'canceled') AS canceled_count
      FROM issues
      WHERE project_id = ${input.projectId}
        AND (closed_at IS NOT NULL OR canceled_at IS NOT NULL)
        AND COALESCE(closed_at, canceled_at) >= ${input.from}
        AND COALESCE(closed_at, canceled_at) < ${input.to}
      GROUP BY week_starting_at
      ORDER BY week_starting_at ASC
    `)) as unknown as ThroughputRow[];

    return rows.map((r) => ({
      weekStartingAt: r.week_starting_at,
      closedCount: Number(r.closed_count),
      canceledCount: Number(r.canceled_count),
    }));
  }

  async getProjectCycleTime(input: { projectId: string }): Promise<CycleTimeReport> {
    const rows = (await this.db.execute<CycleTimeRow>(sql`
      SELECT
        COUNT(*) AS sample_size,
        AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400.0) AS avg_days,
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400.0
        ) AS p50_days,
        PERCENTILE_CONT(0.9) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400.0
        ) AS p90_days
      FROM issues
      WHERE project_id = ${input.projectId}
        AND status = 'done'
        AND closed_at IS NOT NULL
    `)) as unknown as CycleTimeRow[];

    const row = rows[0];
    if (!row) {
      return {
        projectId: input.projectId,
        sampleSize: 0,
        avgDays: 0,
        p50Days: 0,
        p90Days: 0,
      };
    }
    return {
      projectId: input.projectId,
      sampleSize: Number(row.sample_size),
      avgDays: row.avg_days != null ? Number(row.avg_days) : 0,
      p50Days: row.p50_days != null ? Number(row.p50_days) : 0,
      p90Days: row.p90_days != null ? Number(row.p90_days) : 0,
    };
  }

  async getProjectStatusDistribution(input: {
    projectId: string;
  }): Promise<StatusDistribution> {
    const rows = (await this.db.execute<StatusRow>(sql`
      SELECT status, COUNT(*) AS cnt
      FROM issues
      WHERE project_id = ${input.projectId}
      GROUP BY status
    `)) as unknown as StatusRow[];

    const counts: Record<IssueStatus, number> = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
      canceled: 0,
    };
    let total = 0;
    for (const r of rows) {
      const n = Number(r.cnt);
      if (ISSUE_STATUSES.includes(r.status)) {
        counts[r.status] = n;
        total += n;
      }
    }
    return { projectId: input.projectId, counts, total };
  }
}
