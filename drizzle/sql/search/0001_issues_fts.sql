-- Full-Text Search (FTS) para issues — Stint B7 (agent-b/B07-search).
--
-- ORDEM: roda DEPOIS do schema base do Agente A (tabela public.issues já existe
-- com title/description). NÃO modifica o schema Drizzle em TS
-- (src/infrastructure/db/schema/*): esta coluna gerada + índice GIN vivem só aqui,
-- como migration SQL crua, porque o Drizzle não modela colunas GENERATED/tsvector.
--
-- Idempotente: pode ser aplicado mais de uma vez sem erro (IF NOT EXISTS).

-- Coluna gerada com o tsvector do documento (title + description). STORED para
-- que o índice GIN possa indexá-la diretamente.
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) STORED;

-- Índice GIN para casamento rápido de @@ tsquery.
CREATE INDEX IF NOT EXISTS issues_search_idx
  ON public.issues USING gin (search_vector);
