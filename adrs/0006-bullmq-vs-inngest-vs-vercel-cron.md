# ADR-0006 — Fila de entrega de webhooks: BullMQ + Upstash vs Inngest vs Vercel Cron

- **Status:** Accepted
- **Data:** 2026-06-07
- **Stint:** B2 (`agent-b/B02-webhooks-domain`)
- **Autor:** Agente B
- **Atributo de qualidade prioritário (ISO/IEC 25010):** Confiabilidade (entrega ao menos uma vez, retries, dead-letter)

## Contexto

O Trackr precisa entregar webhooks a endpoints externos de forma **confiável**:
chamadas HTTP a sistemas de terceiros falham (timeouts, 5xx, indisponibilidade),
então a entrega precisa de **fila durável, retries com backoff e dead-letter**.
Isso é um processamento **assíncrono e em background**, desacoplado do request que
originou o evento (ex.: `IssueAssigned`).

Restrições do projeto:

- Confiabilidade é o atributo de qualidade nº 1 (junto com manutenibilidade).
- Já temos **Upstash Redis** na stack (cache + filas) — sem custo de infra nova.
- **Equipe pequena** (trabalho acadêmico em dupla) — pouco apetite por operar
  infraestrutura adicional ou aprender um modelo de programação novo.
- Roda em Next.js 15; o worker pode rodar como processo Node separado.

Este ADR decide **como** a fila de entrega é implementada. O domínio (B2) já isola
isso atrás da port `DeliveryQueue`; o adapter concreto entra no **B3**.

## Decisão

Usar **BullMQ sobre Upstash Redis** como fila de entrega de webhooks. A port
`DeliveryQueue` (B2) é implementada por um `BullMqDeliveryQueue` (B3), e um **worker
BullMQ** consome a fila, tenta a entrega com a `RetryPolicy` (Strategy, B3) do
endpoint, e registra cada `DeliveryAttempt`. Falhas além do `maxAttempts` viram
`dead_lettered`.

## Justificativa

- **Confiabilidade** — BullMQ oferece nativamente o que o domínio precisa: jobs
  persistidos em Redis (sobrevivem a restart do worker), **retries com backoff
  configurável**, **dead-letter** (failed jobs retidos para inspeção) e
  idempotência por `jobId`. Casa diretamente com a `RetryPolicy` e o ciclo
  `pending → in_progress → succeeded/failed/dead_lettered` modelados no B2.
- **Custo operacional zero adicional** — Upstash Redis **já está na stack**
  (cache). Reaproveitar reduz superfície de operação e custo — relevante para uma
  equipe pequena. Não introduz um serviço SaaS novo nem um vendor a mais.
- **Controle e portabilidade** — BullMQ é OSS rodando sobre Redis padrão; sem
  lock-in. O modelo (produtor enfileira / worker consome) é conhecido e debugável
  localmente. A abstração `DeliveryQueue` mantém o domínio agnóstico — trocar de
  fila no futuro é reimplementar um adapter.

## Alternativas consideradas

| Alternativa | Por que rejeitada |
|---|---|
| **Inngest** | Ótima DX para workflows duráveis e step functions, com retries gerenciados. Porém adiciona **um SaaS e um vendor novos**, um modelo de programação próprio (steps/functions) para a equipe aprender, e tira o controle da fila para fora da nossa infra. Para o escopo (entregar webhooks com retry/backoff), é mais peso do que precisamos, e duplica capacidade que o Upstash que já temos cobre. |
| **Vercel Cron** | Bom para tarefas **agendadas** (polling periódico), não para uma **fila orientada a eventos** com backoff por job. Não há fila durável nem dead-letter nativo; teríamos que construir o estado da fila à mão no Postgres e politicar retries por cron, reinventando — pior em confiabilidade e mais código. Útil, no máximo, como gatilho do relay, não como o mecanismo de entrega. |
| **Tabela no Postgres + polling próprio** | Já temos o **Outbox** (ADR-0007) para publicar eventos de forma confiável, mas uma fila de entrega HTTP com backoff/dead-letter sobre polling de tabela seria reimplementar BullMQ com menos garantias e mais código de manutenção para uma equipe pequena. |

## Consequências

### Positivas

- Retries, backoff e dead-letter "de fábrica", alinhados ao domínio do B2.
- Reuso do Upstash Redis — sem infra/custo novos.
- Domínio desacoplado da fila via port `DeliveryQueue` (testável com fila in-memory).
- Worker isolado: falha/recuperação do worker não afeta o request original.

### Negativas

- Exige **operar um worker** (processo separado) além do app Next.js.
- BullMQ pressupõe Redis compatível; em Upstash há limites de conexão/serverless a
  observar (usar o cliente adequado / connection reuse no B3).
- Visibilidade de jobs falhos depende de tooling (Bull Board ou queries) — não há
  dashboard gerenciado como o Inngest traria.

## Referências

- BullMQ — <https://docs.bullmq.io>
- Upstash Redis — <https://upstash.com/docs/redis>
- Inngest — <https://www.inngest.com/docs>
- Vercel Cron Jobs — <https://vercel.com/docs/cron-jobs>
- Relacionado: ADR-0007 (Outbox para publicação confiável de eventos de domínio).
