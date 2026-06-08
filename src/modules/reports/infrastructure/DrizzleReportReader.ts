import { sql } from "drizzle-orm";
import type { Database } from "@/infrastructure/db/client";
import type { ReportReader } from "../application/ports/ReportReader";
import type {
  BurndownReport,
  CycleTimeReport,
  SprintVelocity,
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

type SprintMetaRow = {
  id: string;
  name: string;
  start_date: Date;
  end_date: Date;
} & Record<string, unknown>;

type VelocityCountsRow = {
  committed: string | number;
  completed: string | number;
} & Record<string, unknown>;

type BurndownClosedRow = {
  closed_date: Date;
  closed_count: string | number;
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

  async getSprintVelocity(input: { sprintId: string }): Promise<SprintVelocity | null> {
    const sprintRows = (await this.db.execute<SprintMetaRow>(sql`
      SELECT id, name, start_date, end_date
      FROM sprints
      WHERE id = ${input.sprintId}
    `)) as unknown as SprintMetaRow[];
    const sprint = sprintRows[0];
    if (!sprint) return null;

    const counts = (await this.db.execute<VelocityCountsRow>(sql`
      SELECT
        COUNT(*) AS committed,
        COUNT(*) FILTER (
          WHERE i.status = 'done'
            AND i.closed_at IS NOT NULL
            AND i.closed_at >= ${sprint.start_date}
            AND i.closed_at <= ${sprint.end_date}
        ) AS completed
      FROM sprint_issues si
      JOIN issues i ON i.id = si.issue_id
      WHERE si.sprint_id = ${input.sprintId}
    `)) as unknown as VelocityCountsRow[];
    const row = counts[0];
    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      committedIssues: row ? Number(row.committed) : 0,
      completedIssues: row ? Number(row.completed) : 0,
    };
  }

  async getSprintBurndown(input: { sprintId: string }): Promise<BurndownReport | null> {
    const sprintRows = (await this.db.execute<SprintMetaRow>(sql`
      SELECT id, name, start_date, end_date
      FROM sprints
      WHERE id = ${input.sprintId}
    `)) as unknown as SprintMetaRow[];
    const sprint = sprintRows[0];
    if (!sprint) return null;

    const totalsRow = (await this.db.execute<{ total: string | number }>(sql`
      SELECT COUNT(*) AS total
      FROM sprint_issues
      WHERE sprint_id = ${input.sprintId}
    `)) as unknown as Array<{ total: string | number }>;
    const totalIssues = totalsRow[0] ? Number(totalsRow[0].total) : 0;

    // Quantas issues fecharam em cada dia entre startDate e min(today, endDate).
    const closedRows = (await this.db.execute<BurndownClosedRow>(sql`
      SELECT
        date_trunc('day', i.closed_at)::timestamptz AS closed_date,
        COUNT(*) AS closed_count
      FROM sprint_issues si
      JOIN issues i ON i.id = si.issue_id
      WHERE si.sprint_id = ${input.sprintId}
        AND i.closed_at IS NOT NULL
        AND i.closed_at >= ${sprint.start_date}
      GROUP BY closed_date
      ORDER BY closed_date ASC
    `)) as unknown as BurndownClosedRow[];

    const closedPerDay = new Map<string, number>();
    for (const r of closedRows) {
      closedPerDay.set(r.closed_date.toISOString().slice(0, 10), Number(r.closed_count));
    }

    const points = [];
    const start = new Date(sprint.start_date);
    start.setUTCHours(0, 0, 0, 0);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const end = new Date(sprint.end_date);
    end.setUTCHours(0, 0, 0, 0);
    const lastDay = today < end ? today : end;

    let remaining = totalIssues;
    for (let d = new Date(start); d <= lastDay; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      remaining -= closedPerDay.get(key) ?? 0;
      points.push({ date: new Date(d), remainingIssues: Math.max(0, remaining) });
    }

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      totalIssues,
      points,
    };
  }
}
