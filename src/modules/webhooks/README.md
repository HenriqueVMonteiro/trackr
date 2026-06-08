# `webhooks` — Webhooks bounded context

Entrega confiável de webhooks a endpoints externos. Domínio + repositórios + use
cases (B2). A entrega HTTP, a Strategy de retry e o worker BullMQ ficam no **B3**.
Ver [ADR-0006](../../../adrs/0006-bullmq-vs-inngest-vs-vercel-cron.md).

## Camadas

```
webhooks/
├── domain/                      # entidades imutáveis, Result, sem framework
│   ├── RetryPolicy.ts           # union { exponential|linear|fixed } — GoF: Strategy (impl em B3)
│   ├── WebhookEndpoint.ts       # url https, secret >= 16, signature algo
│   ├── WebhookDelivery.ts       # ciclo pending/in_progress/succeeded/failed/dead_lettered
│   ├── DeliveryAttempt.ts       # registro de uma tentativa HTTP
│   └── events.ts
├── application/
│   ├── ports/                   # WebhookRepository, DeliveryRepository, DeliveryQueue (SOLID: DIP)
│   └── use-cases/               # CreateEndpoint, ListEndpoints, DeleteEndpoint,
│                                #   EnqueueDelivery, RecordAttempt (Result)
├── infrastructure/
│   ├── DrizzleWebhookRepository.ts
│   ├── DrizzleDeliveryRepository.ts
│   └── InMemoryDeliveryQueue.ts # placeholder de DeliveryQueue até o BullMQ do B3
└── index.ts                     # createWebhooksModule({ db, clock, ids, events, queue? })
```

Schema em [`src/infrastructure/db/schema/webhooks.ts`](../../infrastructure/db/schema/webhooks.ts).

## Padrões evidenciados

- **GoF: Strategy** (dado) — `RetryPolicy` union; algoritmos de backoff entram no B3.
- **GoF: Factory** — `createWebhooksModule(deps)` (DI, sem singleton).
- **SOLID: DIP** — use cases dependem das ports; **LSP** — `InMemoryDeliveryQueue`
  substituível pelo `BullMqDeliveryQueue` (B3) sem mudar os use cases.
- **Result pattern** — factories de domínio e use cases retornam `Result<T, DomainError>`.

## Status (B2) e o que fica para depois

Entregue: schema, domínio, ports, use cases CRUD + Enqueue/Record, repos Drizzle,
`InMemoryDeliveryQueue`, ADR-0006. Use cases cobertos por testes unitários
(≥80% no `domain/`/`application/`).

**Deferido:**
- **Testes de integração dos repos Drizzle** (Postgres real) → **B12**, que monta
  `tests/integration/` + `vitest.integration.config.ts` (mesmo precedente do RLS no
  B1). O gate do PR (`npm run test`) cobre o domínio/aplicação por unit tests.
- **B3** — Strategy de retry (Exponential/Linear/Fixed), `WebhookSigner` (HMAC, LSP)
  e `BullMqDeliveryQueue` + worker consumidor sobre Upstash Redis.
