# ADR-0007: Outbox Pattern for reliable event delivery

## Status

Accepted (2026-06-07)

## Contexto

Trackr depende de eventos de domínio (`issue.created`, `issue.transitioned`, `workspace.member_invited`, etc.) para acionar **side effects externos**:

- Entrega de webhooks de saída para integrações (Slack, Discord, GitHub, etc.) — feita em workers BullMQ
- Disparo de notificações multi-canal (email, push, in-app) — também via BullMQ
- Broadcast in-app via Supabase Realtime
- Persistência do Activity Log (Memento snapshots)

Os subscribers desses eventos ficam no EventBus em memória ([ADR-0002](./0002-hexagonal-clean-architecture-per-module.md) + `src/shared/events`). Mas o EventBus em memória **não sobrevive a quedas do processo**. Se um use case completa a transação que muda estado e o processo cai antes do EventBus despachar para os subscribers, **os eventos se perdem**.

Cenários de falha que enfrentamos:

1. Use case faz `UPDATE issues SET status = 'done' WHERE id = ...` com sucesso, depois o processo é morto antes de chamar `eventBus.publish(IssueTransitioned)`. O assignee nunca recebe notificação. Webhook nunca dispara.
2. EventBus despacha mas Redis/Upstash está indisponível. O webhook-worker nunca recebe o job.
3. Subscriber lança erro (bug). Outros subscribers do mesmo evento não rodam.

Confiabilidade (`Reliability` em ISO/IEC 25010:2023) foi declarada atributo prioritário do projeto ([design spec §4.1](../docs/superpowers/specs/2026-06-07-trackr-design.md)). A taxa de entrega de webhook ≥99% em 24h é a métrica observável que estabelecemos. Sem mecanismo de durabilidade, esse alvo não é atingível.

## Decisão

Adotamos o **Outbox Pattern**.

Regras:

1. Toda mudança de estado de aggregate que **deve disparar evento externo** insere uma linha na tabela `outbox` na **mesma transação SQL** que altera o estado.
2. O subscriber em memória (EventBus) continua existindo para activity log, métricas, e efeitos in-process que não precisam de durabilidade externa.
3. Um **relay worker** separado (`src/infrastructure/queue/workers/outbox-relay.ts`, entregue no stint A9) lê linhas com `published_at IS NULL`, publica no EventBus em memória, e marca `published_at = now()`.
4. O relay worker roda em loop com polling de 1-2s + LISTEN/NOTIFY do Postgres (opcional optimization) para baixa latência.
5. O envio efetivo do webhook ou notificação **ainda passa pela fila BullMQ** ([ADR-0006](./0006-bullmq-vs-inngest-vs-vercel-cron.md)), com retry policies por endpoint. O outbox apenas garante que **o evento chega no EventBus** mesmo em quedas; daí em diante BullMQ cuida da entrega final com retries.

Schema:

```sql
CREATE TABLE outbox (
  id              TEXT PRIMARY KEY,
  aggregate_type  TEXT NOT NULL,
  aggregate_id    TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX outbox_unpublished_idx ON outbox (published_at, created_at);
```

(Schema já entregue no stint A3.)

## Consequências

### Positivas

- **At-least-once delivery garantida** entre o use case e o EventBus
- **Auditoria** — toda mudança de estado gera linha no outbox, com timestamp e payload completos. Útil para debug e replay
- **Recuperação** — após queda do worker, processamento retoma do ponto onde parou (linhas com `published_at IS NULL`)
- **Acopla atributo de qualidade Reliability** à arquitetura de forma observável (métrica: linhas no outbox com `published_at IS NULL` por mais de N segundos = alerta)
- **Replay possível** — para debug ou correção de incidentes, pode-se zerar `published_at` num intervalo e re-disparar

### Negativas

- **Overhead de escrita** — toda mudança paga 1 INSERT extra. Aceito porque escritas no Trackr são humanas (poucas por segundo), não throughput de log
- **Latência adicional** — entre o COMMIT da transação e a entrega real, há o polling do relay worker. Tipicamente 1-2s. Aceito.
- **Idempotência exigida** dos subscribers — at-least-once permite entrega dupla. Subscribers críticos (webhook delivery, email) precisam ser idempotentes via chave própria (`event.id` ou similar). Convenção do projeto: todo subscriber externo lida com isso.
- **Tabela outbox cresce indefinidamente** — políticas de purging: linhas com `published_at IS NOT NULL` há mais de 30 dias podem ser arquivadas/deletadas. Job manual por agora.

### Neutras

- Workers ficam mais simples — eles só consomem da fila BullMQ; quem coloca na fila é o relay worker (com idempotency key derivada de `outbox.id`).
- Para testes unitários de use cases, o outbox vira "publicação ao EventBus" via repo fake; teste de integração cobre a leitura da tabela.

## Alternativas consideradas

### Opção A — Publish direto no EventBus, sem outbox

Use case faz `await eventBus.publish(...)` logo após commit.

**Rejeitada porque:**

- Janela de race entre commit e publish — se o processo cai aqui, evento perdido
- A garantia de entrega cai a "best effort"
- Reliability ≥99% não é atingível sem essa janela ser fechada

### Opção B — Two-phase commit / XA

Coordenação distribuída entre Postgres e Redis.

**Rejeitada porque:**

- Complexidade operacional altíssima
- Suporte XA do Redis é limitado
- Performance ruim
- Overkill para o problema real

### Opção C — Change Data Capture (Debezium, etc.)

Ler o WAL do Postgres e converter em eventos.

**Rejeitada porque:**

- Infra adicional (Kafka Connect, Debezium)
- Custo operacional alto
- Mapeamento WAL → eventos de domínio precisa de tradução manual de qualquer jeito
- Equipe pequena, sem time de infra dedicado

### Opção D — Listen/Notify do Postgres como bus de eventos

`NOTIFY` no momento do commit.

**Rejeitada (parcialmente) porque:**

- `NOTIFY` perde mensagens se nenhum subscriber está conectado quando dispara — não é durável
- Aceita como **optimization** opcional sobre o outbox: o relay worker faz `LISTEN` para reduzir latência de polling, mas o `outbox` continua sendo a fonte de verdade

## Referências

- Vernon, V. — *Implementing Domain-Driven Design* (2013), cap. 14 (Application Services and Outbox)
- Microservices.io — [Pattern: Transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- Designing Data-Intensive Applications (Kleppmann, 2017) — durabilidade e at-least-once
- ISO/IEC 25010:2023 — Reliability (Maturity, Fault tolerance, Recoverability)
- [ADR-0001](./0001-modular-monolith-vs-microservices.md) — monolito modular justifica outbox in-process
- [ADR-0002](./0002-hexagonal-clean-architecture-per-module.md) — EventBus como port
- [ADR-0006](./0006-bullmq-vs-inngest-vs-vercel-cron.md) — BullMQ entrega final (Agente B)
