# ADR-0001: Modular Monolith vs Microservices

## Status

Accepted (2026-06-07)

## Contexto

Trackr é o trabalho final de Arquitetura de Software. Equipe: dois agentes Claude Code paralelos (Agente A e Agente B), prazo até a primeira semana de junho de 2026, sem requisito de produção real, sem SLA externo, sem cliente pagante.

O sistema tem múltiplos bounded contexts identificáveis (workspaces, issues, sprints, webhooks, notificações, busca, dashboards, time tracking). Cada um pode crescer em complexidade e poderia, teoricamente, justificar serviço próprio.

Contudo, a equipe é pequena, o orçamento operacional é zero (deploy alvo: Vercel), não há demanda de escalar módulos independentemente, e a banca avaliadora vai ler **código** — não topologia de runtime. O critério explícito do edital exige justificar a escolha entre monolito (clássico ou modular) e microsserviços com base em atributos de qualidade e maturidade da equipe.

Forças em jogo:

- Manutenibilidade prioritária (ISO/IEC 25010) — clareza vence performance distribuída
- Equipe de 2 agentes — overhead de coordenação cross-service não se paga
- Complexidade operacional de microsserviços (rede, observabilidade, deploys, contratos versionados) consome stints que valeriam mais em domínio rico
- Modularização interna permite extrair microsserviço futuro sem reescrita, se algum dia se justificar

## Decisão

Adotaremos **Monolito Modular** com bounded contexts explícitos em `src/modules/<contexto>/`, cada um com sua arquitetura hexagonal interna (ver [ADR-0002](./0002-hexagonal-clean-architecture-per-module.md)).

Fronteiras entre módulos são impostas por:

1. **Barrel obrigatório** — cada módulo expõe apenas o que está em `index.ts`; imports cross-module só passam por esse barrel
2. **Schema de banco isolado** — cada módulo tem suas tabelas em `src/infrastructure/db/schema/<contexto>.ts`; FKs cross-module são permitidas, mas escritas só pelo módulo dono
3. **Eventos para comunicação assíncrona** — outros módulos não chamam use cases diretamente; reagem a `DomainEvent`s publicados no EventBus

O runtime é **um único processo Next.js** + workers Node.js em containers (BullMQ workers podem ficar em processo separado para isolamento de fila — ainda monolito modular).

## Consequências

### Positivas

- **Manutenibilidade alta** — todo o código numa árvore só, refactor cross-context é uma operação local
- **Deploy simples** — `vercel deploy` para a web, container único para workers
- **Custo operacional zero** — Vercel free tier + Upstash + Supabase free tier
- **Velocidade de desenvolvimento** — sem versionamento de contrato entre serviços, sem mocks de rede
- **Testes integrados sem fricção** — `Postgres + Redis` locais cobrem tudo

### Negativas

- **Risco de erosão de fronteiras** — sem disciplina, módulos viram bagunça acoplada. Mitigação: barrel + code review + lint rule futura (`dependency-cruiser`)
- **Escalabilidade limitada do processo único** — irrelevante no escopo acadêmico, mas seria gargalo se virasse produto real
- **Worker no mesmo repo dilui foco** — aceito; permite compartilhar `domain/` sem republicar pacote

### Neutras

- Banca vai ver arquitetura modular bem demonstrada e justificada, não distribuída
- Futura extração de microsserviço requer: extrair módulo para repo próprio, publicar contrato (gRPC/REST), substituir chamadas internas por cliente HTTP — tudo bem definido

## Alternativas consideradas

### Opção A — Microsserviços por bounded context

Cada módulo (workspaces, issues, webhooks, notifications, search, reports) seria um serviço próprio, com banco próprio (ou schema próprio), comunicando-se por REST/gRPC ou eventos via fila.

**Rejeitada porque:** overhead operacional é enorme; equipe de 2 agentes não absorve a complexidade de orquestração; banca não tem como avaliar topologia (vai ler código); custo de deploy ultrapassa o tier gratuito; tempo gasto em infraestrutura é tempo não gasto em design de domínio (que é o que será avaliado).

### Opção B — Monolito clássico (não-modular)

Sem fronteiras explícitas entre contexts; código organizado por tipo (`controllers/`, `services/`, `models/`).

**Rejeitada porque:** não evidencia desenho arquitetural; SOLID/GoF ficam diluídos; viola critério explícito do edital de "decomposição em unidades implantáveis" — mesmo num monolito, a decomposição interna é avaliada.

## Referências

- Fowler, M. — [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html)
- Newman, S. — *Monolith to Microservices* (2019), cap. 1 — quando NÃO extrair
- ISO/IEC 25010:2023 — Maintainability
- [ADR-0002](./0002-hexagonal-clean-architecture-per-module.md) — organização interna de cada módulo
