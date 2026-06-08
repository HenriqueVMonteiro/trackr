# ADR-0009: Activity Log inline capture per use case (Memento)

## Status

Accepted (2026-06-07)

## Contexto

O atributo de qualidade Reliability ([ADR-0001](./0001-modular-monolith-vs-microservices.md), [ADR-0007](./0007-outbox-pattern.md)) e a UI rica de timeline ("Maria mudou prioridade de Low para High em 7 de junho") exigem um registro durável e fidedigno de toda mudança em uma Issue: criação, transição de status, atribuição, edição, mudança de prioridade.

O padrão GoF Memento foi escolhido como modelo para esse registro: cada mudança gera um snapshot imutável do estado anterior e posterior, com um diff estrutural pré-computado. A classe `ActivitySnapshot` ([`src/modules/issues/domain/ActivitySnapshot.ts`](../src/modules/issues/domain/ActivitySnapshot.ts)) e a tabela `activity` ([`src/infrastructure/db/schema/activity.ts`](../src/infrastructure/db/schema/activity.ts)) foram entregues em A8.

Faltava decidir **onde** o snapshot é criado e persistido. Três alternativas reais:

1. **Inline no use case** — o use case que muda o estado também captura o snapshot e o persiste via `ActivityRepository`, na mesma transação lógica
2. **Subscriber no EventBus** — o use case publica `IssueChanged(before, after)` carregando os dois estados completos no payload; um subscriber separado persiste o snapshot
3. **Trigger no Postgres** — capturar `OLD`/`NEW` no banco via trigger SQL `AFTER UPDATE ON issues`

Esta ADR registra a escolha.

## Decisão

Adotamos **inline no use case** (alternativa 1).

Cada use case que altera estado de `Issue` (`CreateIssue`, `TransitionIssue`, `AssignIssue`, `EditIssue`, `SetPriority`) recebe `ActivityRepository` como dependência injetada, e logo após `issueRepo.save(updated)` cria e persiste o snapshot:

```ts
const snapshot = ActivitySnapshot.capture({
  id: ids.generate(ID_PREFIXES.activity),
  actorId: input.actorId,
  action: "transitioned",
  before: issue,
  after: transitioned.value,
  at: now,
});
await activityRepo.save(snapshot);
```

A port `ActivityRepository` segue [ADR-0002](./0002-hexagonal-clean-architecture-per-module.md) (Hexagonal): vive em `application/ports/` e é implementada por `DrizzleActivityRepository` em `infrastructure/`.

## Consequências

### Positivas

- **Coesão semântica** — a use case é o owner da invariante "houve mudança"; também é a única que conhece `actor` e `action` no nível semântico (ex.: "assigned" vs "reassigned" — diferença que diff sozinho não capta). Mantê-la responsável evita perda de contexto.
- **Atomicidade trivial** — `repo.save(issue)` e `activityRepo.save(snapshot)` na mesma transação SQL via Drizzle é direto. Garantia: ou ambos commitam ou nenhum.
- **Testabilidade** — `FakeActivityRepository` é trivial; testes confirmam que rejeições NÃO geram snapshot vazado (`TransitionIssue.test.ts > does NOT persist a snapshot when the transition is rejected`).
- **Sem dependência de runtime do EventBus** — funciona mesmo se subscribers tiverem bug; activity log é fonte de verdade independente.
- **Permite snapshots ricos** — o use case pode incluir contexto adicional na `action` ("transitioned_by_approver", "force_canceled_by_admin") sem alterar o esquema do evento.

### Negativas

- **Boilerplate por use case** — 5 linhas extras em cada use case que altera estado (5 use cases × 5 linhas = 25 linhas a mais). Mitigação: extrair `captureAndPersistActivity()` helper em A14+ se a duplicação se mostrar real (3+ ocorrências similares).
- **Acoplamento de dependência** — todo use case que escreve em Issue agora depende de `ActivityRepository`. Aceito porque é uma dependência cross-cutting honesta (toda mudança gera audit).
- **Re-trabalho** se a equipe decidir extrair Activity para serviço separado no futuro — mas o ponto de extração é `ActivityRepository` (port única), então o custo é localizado.

### Neutras

- O EventBus existente (`issue.transitioned`, etc.) continua publicando eventos para outros side-effects (webhooks, notificações in-app, broadcast realtime — Agente B). Activity log é canal **separado e durável**.

## Alternativas consideradas

### Opção A — Subscriber no EventBus

`TransitionIssue` publica `IssueTransitioned { before: IssueProps, after: IssueProps, actorId, ... }` e `ActivitySubscriber` ouve e persiste.

**Rejeitada porque:**

- Eventos ficam grandes (carregam snapshot completo) — penaliza serialização Outbox ([ADR-0007](./0007-outbox-pattern.md)) e fila BullMQ ([ADR-0006](./0006-bullmq-vs-inngest-vs-vercel-cron.md))
- Subscriber é executado pelo `OutboxRelay` em outro instante — se relay falha, activity log atrasa em relação à mudança visível na UI
- Atomicidade quebra: snapshot pode existir antes da entity atualizada ser visível para outros leitores em race
- Custo > benefício: o "desacoplamento" oferecido pelo subscriber não traz ganho aqui — o use case já é o caller óbvio

### Opção B — Trigger Postgres `AFTER UPDATE ON issues`

`CREATE TRIGGER ... EXECUTE PROCEDURE log_issue_change()` capturaria `OLD` e `NEW`.

**Rejeitada porque:**

- Perde contexto semântico — o trigger só vê o estado, não sabe se foi `assigned`, `reassigned`, `transitioned`, `edited`. Reconstruir action a partir do diff é frágil.
- Não tem `actorId` confiável — `current_user` no Postgres é o role do app, não o user JWT
- Lock-in com Postgres — vai contra a separação domain/infra que [ADR-0002](./0002-hexagonal-clean-architecture-per-module.md) prescreve (lógica de negócio mora em `domain/`, não em SQL stored procedure)
- Difícil de testar isoladamente — exige Postgres real em todo unit test
- Migração de schema toca a stored procedure — pareamento maior em mudanças

## Referências

- Gamma et al. — *Design Patterns* (1994), capítulo Memento
- Vernon, V. — *Implementing Domain-Driven Design* (2013), cap. 9 (Domain Events) — distinção entre evento e snapshot
- [ADR-0002](./0002-hexagonal-clean-architecture-per-module.md) — Hexagonal + Clean Architecture
- [ADR-0007](./0007-outbox-pattern.md) — Outbox Pattern (justifica por que não usar Outbox aqui)
- Código: [`src/modules/issues/application/use-cases/TransitionIssue.ts`](../src/modules/issues/application/use-cases/TransitionIssue.ts), [`ActivitySnapshot.ts`](../src/modules/issues/domain/ActivitySnapshot.ts), [`DrizzleActivityRepository.ts`](../src/modules/issues/infrastructure/DrizzleActivityRepository.ts)
