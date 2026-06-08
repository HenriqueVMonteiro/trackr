-- Cycle time (createdAt -> closedAt) por projeto, com avg + p50 + p90.
-- Hoje executado direto pelo DrizzleReportReader.getProjectCycleTime().

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_cycle_time AS
SELECT
  project_id,
  COUNT(*) AS sample_size,
  AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400.0) AS avg_days,
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400.0
  ) AS p50_days,
  PERCENTILE_CONT(0.9) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400.0
  ) AS p90_days
FROM issues
WHERE status = 'done' AND closed_at IS NOT NULL
GROUP BY project_id;

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_cycle_time_project_idx
  ON dashboard_cycle_time (project_id);
