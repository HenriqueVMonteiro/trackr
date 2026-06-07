# Source layout

Modular monolith com Hexagonal / Clean Architecture por módulo.

## Diretórios

### `src/modules/<bounded-context>/`

Cada bounded context é um módulo autocontido com quatro camadas. A única API pública
do módulo é o que está exportado do `index.ts` (barrel). Imports cross-module passam
por esse barrel — sem alcançar `domain/` ou `application/` de outro módulo diretamente.

```
src/modules/<bounded-context>/
├── domain/           # TypeScript puro. Entidades, value objects, eventos de domínio.
│                     # NENHUM import de Next.js, Drizzle, Supabase, etc.
│                     # Testável em isolamento, sem infraestrutura.
├── application/
│   ├── use-cases/    # Application services. Orquestram operações de domínio.
│   ├── ports/        # Interfaces das quais os use cases dependem (DIP).
│   │                 # Repositories, clocks, publishers de evento, etc.
│   └── dto/          # Input/output dos use cases.
├── infrastructure/   # Adapters que implementam as ports.
│                     # Drizzle repository, Supabase auth provider, Redis cache, etc.
├── interface/        # Handlers HTTP, server actions Next.js.
│                     # Delega IMEDIATAMENTE para use cases. Sem regra de negócio aqui.
└── index.ts          # Public barrel.
```

### `src/shared/`

Utilitários transversais: `Result<T,E>`, base errors, EventBus port, Clock port,
base value objects. Nada específico de aplicação.

### `src/infrastructure/`

Infraestrutura transversal: cliente Drizzle, cliente Redis, clientes Supabase,
definições de schema. Cada módulo referencia via suas próprias ports.

### `src/app/`

Next.js App Router. **Apenas a camada interface.** Route handlers e server actions
delegam imediatamente para use cases dos módulos.

## Imports proibidos

- `domain/` → nunca importa `application/`, `infrastructure/`, `interface/`, ou framework
- `application/` → nunca importa `infrastructure/` diretamente (usa ports)
- Cross-module → nunca alcança `domain/`, `application/` etc. de outro módulo — só pelo barrel

Essas regras são verificadas em code review (e idealmente por `dependency-cruiser`).

## Dependency Injection

Cada módulo expõe `createXxxModule(deps)` factory no seu `index.ts` que conecta
adapters concretos aos use cases. A composição em `src/app/` chama essas factories
uma vez no bootstrap.

## Padrões marcados em código

Procure por estes comentários para encontrar aplicações de padrões:

- `// GoF: <Padrão>` — padrão Gang of Four
- `// SOLID: <Princípio>` — princípio SOLID demonstrado
- `// ADR-<NNN>` — decisão registrada em `adrs/<NNN>-...`
