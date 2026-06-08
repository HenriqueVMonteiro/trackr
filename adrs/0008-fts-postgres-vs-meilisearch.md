# ADR-0008 — Busca de issues: Postgres FTS vs MeiliSearch/Algolia

- **Status:** Accepted (supersede a proposta inicial de MeiliSearch deste mesmo ADR)
- **Data:** 2026-06-07
- **Stint:** B7 (`agent-b/B07-search`)
- **Autor:** Agente B
- **Atributo de qualidade prioritário (ISO/IEC 25010):** Manutenibilidade — simplicidade operacional / custo

## Contexto

O Trackr precisa de **busca textual** sobre issues (título + descrição), com
filtro por workspace/projeto, snippet destacado e ordenação por relevância, data
ou prioridade. É uma feature de produto importante, mas **não é o core** do
sistema (gestão de issues/projetos), e o volume esperado é modesto (equipe pequena,
trabalho acadêmico).

Restrições do projeto:

- **Equipe pequena** (dupla) — pouco apetite para operar e manter infraestrutura
  de busca dedicada (indexação, sincronização, reindex, monitoração).
- **Custo** — adicionar um serviço de busca gerenciado (Algolia) ou auto-hospedado
  (MeiliSearch/Elasticsearch) significa custo recorrente e/ou um processo a mais
  na stack.
- Já temos **Postgres** (Supabase) como banco principal, com FTS nativo maduro
  (`tsvector`, `tsquery`, `ts_rank`, `ts_headline`, índice GIN).
- A consistência importa: a busca deve refletir o estado atual das issues sem um
  pipeline de sincronização frágil entre o banco e um índice externo.

**Reversão de decisão.** A proposta **inicial** da equipe (no design do épico de
busca) inclinava-se a **MeiliSearch** (ou Algolia) pela qualidade de relevância,
typo-tolerance e DX de busca "as-you-type". Ao detalhar o B7, **revertemos** essa
inclinação: o custo operacional e financeiro de manter um índice externo
sincronizado não se justifica para o volume e o tamanho da equipe atuais. Este ADR
documenta a decisão revertida e **supersede** aquela inclinação inicial por
MeiliSearch.

## Decisão

Usar **Postgres Full-Text Search nativo**, ao invés de MeiliSearch ou Algolia.

A busca é implementada por um adapter `PostgresFtsSearcher` atrás da port
`IssueSearcher` (SOLID: ISP, read-only). Usamos:

- `websearch_to_tsquery('english', texto)` para interpretar a query do usuário;
- `to_tsvector` sobre `title + description` como documento;
- `ts_rank` como score de relevância e `ts_headline` para o snippet destacado;
- uma coluna gerada `search_vector` (`tsvector` STORED) + índice **GIN**
  (`drizzle/sql/search/0001_issues_fts.sql`) para performance.

A **ordenação** (relevance/date/priority) é aplicada na aplicação via uma
**Strategy** (`rankingFor`), e há um **Decorator** opcional de cache
(`CachedSearcher` + port `Cache`, implementada por `UpstashRedisCache`) para
amortizar buscas repetidas. Escopo: o adapter cobre busca por texto com filtro de
workspace/projeto, paginação simples e ranking pós-fetch — **não** cobre
typo-tolerance avançada nem busca facetada/agregada.

## Justificativa

- **Simplicidade operacional (atributo nº 1)** — zero infraestrutura nova: a busca
  roda no banco que já temos. Sem índice externo para provisionar, sincronizar,
  reindexar ou monitorar. Menos peças = menos modos de falha para uma equipe
  pequena manter.
- **Custo** — nenhum serviço de busca gerenciado (Algolia cobra por operação/
  registro) nem processo auto-hospedado adicional (MeiliSearch/Elasticsearch
  consomem memória e exigem operação). Reaproveita o Postgres já pago.
- **Consistência** — a busca lê a **mesma fonte de verdade** transacional; não há
  janela de defasagem entre o banco e um índice externo, nem pipeline de
  sincronização para quebrar.
- **Portabilidade do domínio** — o domínio depende só da port `IssueSearcher`.
  Se a relevância do FTS se mostrar insuficiente no futuro, trocar para MeiliSearch
  é **reimplementar um adapter**, sem tocar a aplicação. A decisão é reversível.

## Alternativas consideradas

### Opção A — MeiliSearch (proposta inicial, revertida)

Motor de busca OSS com excelente relevância, typo-tolerance e busca "as-you-type".
**Por que NÃO:** auto-hospedar significa **um processo a mais** para operar (memória,
backups, upgrades) e um **pipeline de sincronização** issues→índice que precisa ser
escrito, testado e mantido consistente. Para o volume atual e uma equipe de duas
pessoas, é mais custo operacional do que valor entregue. Esta era a inclinação
inicial; foi **revertida** neste ADR.

### Opção B — Algolia (SaaS)

Busca gerenciada, DX excelente, relevância e typo-tolerance de primeira.
**Por que NÃO:** **custo recorrente** que escala com operações/registros e um
**vendor lock-in**; mesmo problema de sincronização (índice externo defasado do
banco). Injustificável para o estágio do produto.

### Opção C — Elasticsearch / OpenSearch

Muito poderoso (facetas, agregações, relevância ajustável).
**Por que NÃO:** o **mais pesado** de operar (cluster, JVM, sharding, custo de infra).
Overkill total para busca de issues numa equipe pequena — exatamente o oposto da
simplicidade operacional que priorizamos.

## Consequências

### Positivas

- Sem infra/serviço/custo novos; busca vive no Postgres que já temos.
- Sem pipeline de sincronização: resultados sempre consistentes com a fonte de
  verdade transacional.
- Índice GIN + coluna gerada dão performance adequada ao volume esperado.
- Domínio desacoplado via `IssueSearcher` — migração futura é troca de adapter.

### Negativas

- **Relevância e typo-tolerance inferiores** a MeiliSearch/Algolia: o FTS do
  Postgres é bom, mas não faz fuzzy matching out-of-the-box (mitigável com
  `pg_trgm` se necessário).
- Funcionalidades avançadas (facetas ricas, synonyms, ranking tuning fino) exigiriam
  trabalho extra em SQL.
- Sob volume muito alto, FTS no banco principal disputa recursos com a carga
  transacional — ponto de reavaliação futura.

### Neutras

- A coluna `search_vector` e o índice GIN vivem como **migration SQL crua**
  (`drizzle/sql/search/0001_issues_fts.sql`), **fora** do schema Drizzle em TS,
  porque o Drizzle não modela colunas `GENERATED`/`tsvector`.
- Cache de busca via Decorator (`CachedSearcher` + Upstash) é opcional e injetado
  no bootstrap.

## Referências

- PostgreSQL Full-Text Search — <https://www.postgresql.org/docs/current/textsearch.html>
- MeiliSearch — <https://www.meilisearch.com/docs>
- Algolia — <https://www.algolia.com/doc/>
- Elasticsearch — <https://www.elastic.co/guide/>
- Relacionado: ADR-0003 (Drizzle vs Prisma vs raw SQL — por que SQL cru aqui).
