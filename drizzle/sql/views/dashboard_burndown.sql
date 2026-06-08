-- Burndown por sprint: para cada dia, quantas issues do sprint ainda nao
-- estavam fechadas.
-- Hoje executado direto. Para producao, materializar diariamente OK.

-- Helper: dia a dia entre start e end do sprint.
CREATE OR REPLACE VIEW dashboard_burndown AS
WITH days AS (
  SELECT
    s.id AS sprint_id,
    s.name AS sprint_name,
    generate_series(
      date_trunc('day', s.start_date),
      LEAST(date_trunc('day', s.end_date), date_trunc('day', NOW())),
      '1 day'::interval
    ) AS d
  FROM sprints s
),
closed_per_day AS (
  SELECT
    si.sprint_id,
    date_trunc('day', i.closed_at) AS closed_day,
    COUNT(*) AS closed_count
  FROM sprint_issues si
  JOIN issues i ON i.id = si.issue_id
  WHERE i.closed_at IS NOT NULL
  GROUP BY si.sprint_id, closed_day
),
sprint_totals AS (
  SELECT sprint_id, COUNT(*) AS total
  FROM sprint_issues
  GROUP BY sprint_id
)
SELECT
  d.sprint_id,
  d.sprint_name,
  d.d AS day,
  t.total - COALESCE(
    SUM(c.closed_count) OVER (
      PARTITION BY d.sprint_id
      ORDER BY d.d
      ROWS UNBOUNDED PRECEDING
    ),
    0
  ) AS remaining_issues
FROM days d
JOIN sprint_totals t ON t.sprint_id = d.sprint_id
LEFT JOIN closed_per_day c ON c.sprint_id = d.sprint_id AND c.closed_day = d.d
ORDER BY d.sprint_id, d.d;
