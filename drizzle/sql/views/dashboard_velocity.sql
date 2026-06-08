-- Velocity por sprint: issues comprometidas e completadas dentro da janela.
-- Hoje executado direto por DrizzleReportReader.getSprintVelocity().
-- Depende do schema sprints + sprint_issues (B6).

CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_velocity AS
SELECT
  s.id AS sprint_id,
  s.name AS sprint_name,
  s.workspace_id,
  COUNT(*) AS committed_issues,
  COUNT(*) FILTER (
    WHERE i.status = 'done'
      AND i.closed_at IS NOT NULL
      AND i.closed_at >= s.start_date
      AND i.closed_at <= s.end_date
  ) AS completed_issues
FROM sprints s
JOIN sprint_issues si ON si.sprint_id = s.id
JOIN issues i ON i.id = si.issue_id
GROUP BY s.id, s.name, s.workspace_id;

CREATE UNIQUE INDEX IF NOT EXISTS dashboard_velocity_sprint_idx
  ON dashboard_velocity (sprint_id);
