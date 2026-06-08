-- Snapshot atual da distribuição de issues por status no projeto.
-- Hoje executado direto. Promoção em produção é opcional aqui — view
-- normal pode ser preferível porque o ganho de cache se paga apenas
-- com refresh, e essa é a query mais barata do trio.

CREATE OR REPLACE VIEW dashboard_status_distribution AS
SELECT
  project_id,
  status,
  COUNT(*) AS cnt
FROM issues
GROUP BY project_id, status;
