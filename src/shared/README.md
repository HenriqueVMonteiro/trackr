# shared/

Utilitários transversais usados por todos os módulos. Sem nada específico de aplicação.

```
src/shared/
├── result/        Result<T, E> + combinators
├── errors/        DomainError + erros comuns
├── clock/         Clock port + SystemClock + FrozenClock
├── ids/           IdGenerator port + Nanoid/Sequential adapters + ID_PREFIXES
├── events/        DomainEvent + EventBus port + InMemoryEventBus (GoF: Observer)
└── index.ts       barrel
```

## Princípios

- **SRP** em cada classe (uma razão para mudar)
- **DIP** — `domain/` e `application/` dependem de **ports** (`Clock`, `IdGenerator`, `EventBus`); adapters concretos (`SystemClock`, `NanoidGenerator`, `InMemoryEventBus`) são injetados pelo bootstrap
- **Testabilidade** — todo port tem um test double aqui (`FrozenClock`, `SequentialIdGenerator`)
- **GoF: Observer** no EventBus (subscribers desacoplados de publishers)
- **Result pattern** em vez de `throw` para erros de negócio previsíveis

## Uso

```ts
import { ok, err, type Result } from "@/shared";
import { NotFoundError } from "@/shared";

async function findUser(id: string): Promise<Result<User, NotFoundError>> {
  const u = await repo.find(id);
  if (!u) return err(new NotFoundError("User", id));
  return ok(u);
}
```

```ts
// Bootstrap (src/app/_bootstrap.ts)
import { SystemClock, NanoidGenerator, InMemoryEventBus } from "@/shared";

const clock = new SystemClock();
const ids = new NanoidGenerator();
const events = new InMemoryEventBus();

const workspacesModule = createWorkspacesModule({ db, clock, ids, events });
```
