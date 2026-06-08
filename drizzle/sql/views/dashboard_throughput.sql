-- Throughput semanal por projeto.
-- Hoje executado direto pelo DrizzleReportReader.getProjectThroughput().
-- Para promoção em produção, criar a materialized view abaixo + índice +
-- refresh por worker (ver drizzle/sql/views/README.md).

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_throughput AS
SELECT
  project_id,
  date_trunc('week', COALESCE(closed_at, canceled_at))::timestamptz AS week_starting_at,
  COUNT(*) FILTER (WHERE status = 'done') AS closed_count,
  COUNT(*) FILTER (WHERE status = 'canceled') AS canceled_count
FROM issues
WHERE closed_at IS NOT NULL OR canceled_at IS NOT NULL
GROUP BY project_id, week_starting_at;

CREATE INDEX IF NOT EXISTS dashboard_throughput_project_week_idx
  ON dashboard_throughput (project_id, week_starting_at DESC);

-- REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_throughput;
