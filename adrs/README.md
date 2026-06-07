# Architecture Decision Records (ADRs)

Esta pasta contém os registros de decisões arquiteturais do Trackr, no formato canônico de [Michael Nygard (2011)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Por que ADRs

Decisões arquiteturais são *importantes e difíceis de mudar* (Fowler/Johnson). Documentá-las captura o **contexto** que motivou a decisão — sem isso, futuros leitores ficam tentados a desfazer escolhas cujo motivo se perdeu.

## Formato

Cada ADR é um arquivo markdown numerado: `NNNN-titulo-em-kebab-case.md`. Contém:

- **Número e título**
- **Status** — Proposed, Accepted, Deprecated, Superseded (com link para o ADR que substitui)
- **Contexto** — as forças e restrições que motivaram a decisão
- **Decisão** — o que foi decidido, em frase clara
- **Consequências** — benefícios e custos esperados (positivos, negativos, neutros)

Veja [`template.md`](./template.md) para o modelo.

## Índice

| # | Título | Status | Autor |
|---|--------|--------|-------|
| [0001](./0001-modular-monolith-vs-microservices.md) | Modular Monolith vs Microservices | Accepted | Agente A |
| [0002](./0002-hexagonal-clean-architecture-per-module.md) | Hexagonal / Clean Architecture per Module | Accepted | Agente A |
| [0003](./0003-drizzle-vs-prisma-vs-raw-sql.md) | Drizzle ORM vs Prisma vs raw SQL | Accepted | Agente A |
| 0004 | Supabase Auth vs NextAuth vs Lucia | Planned (stint B1) | Agente B |
| [0005](./0005-rest-openapi-vs-graphql.md) | REST + OpenAPI vs GraphQL | Accepted | Agente A |
| 0006 | BullMQ + Upstash vs Inngest vs Vercel Cron | Planned (stint B2) | Agente B |
| [0007](./0007-outbox-pattern.md) | Outbox Pattern para entrega confiável de eventos | Accepted | Agente A |
| 0008 | FTS Postgres vs MeiliSearch (**reversão**) | Planned (stint B7) | Agente B |

## Convenções

- Numeração sequencial, nunca reutilizada
- Quando uma decisão substitui outra: o novo ADR tem status `Accepted` e referencia o anterior; o anterior vira `Superseded by ADR-NNNN`
- ADRs nunca são editados após `Accepted` exceto para mudar status — propostas de mudança viram novo ADR
- Pelo menos um ADR no projeto registra uma decisão **revertida ou modificada** (recomendação explícita do edital): ADR-0008
