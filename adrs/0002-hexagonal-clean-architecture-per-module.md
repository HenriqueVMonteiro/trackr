# ADR-0002: Hexagonal / Clean Architecture per Module

## Status

Accepted (2026-06-07)

## Contexto

[ADR-0001](./0001-modular-monolith-vs-microservices.md) estabeleceu o monolito modular. Resta decidir como **cada módulo** se organiza por dentro. As opções clássicas:

- MVC clássico (Controller → Service → Model com ActiveRecord)
- Camadas tradicionais (Controllers → Services → Repositories → Entities)
- Hexagonal / Ports & Adapters (Cockburn) — domínio no centro, adapters de entrada/saída na borda
- Clean Architecture (R. C. Martin) — domínio → use cases → adapters → frameworks, regra de dependência apontando para o centro

Forças em jogo:

- Manutenibilidade prioritária (ISO/IEC 25010, [ADR-0001](./0001-modular-monolith-vs-microservices.md))
- Necessidade de demonstrar SOLID e GoF de forma **objetivamente evidente** para a banca
- Domínio com regras de negócio não-triviais: state machine de issues, transições, agregados, regras de timing de sprint
- Stack Next.js — frameworks de UI/HTTP podem mudar rapidamente; queremos isolar regra de negócio
- Testabilidade — domain precisa ser testável sem subir Next.js, Postgres, Supabase

## Decisão

Adotaremos **Hexagonal + Clean Architecture combinados** em cada módulo:

```
src/modules/<contexto>/
├── domain/           # TS puro: entities, value objects, eventos
├── application/
│   ├── use-cases/    # 1 use case = 1 arquivo (SRP)
│   ├── ports/        # interfaces (DIP)
│   └── dto/
├── infrastructure/   # adapters concretos (Drizzle, Supabase, Redis)
├── interface/        # Next.js handlers + server actions
└── index.ts          # barrel público
```

Regras de dependência (verificadas em code review, opcionalmente em lint):

1. `domain/` NUNCA importa `application/`, `infrastructure/`, `interface/` ou qualquer framework (Next, Drizzle, Supabase). É TypeScript puro.
2. `application/` importa só `domain/` e suas próprias ports em `./ports/`. NUNCA importa `infrastructure/` diretamente — depende de port (DIP).
3. `infrastructure/` implementa as ports. Importa libs externas (Drizzle, Supabase, etc.).
4. `interface/` recebe requisição HTTP/server action, delega imediatamente a um use case. ZERO lógica de negócio.

**Composition root:** o `index.ts` de cada módulo expõe `createXxxModule(deps): XxxPublicAPI`. O bootstrap em `src/app/` chama essas factories uma vez, injetando os adapters concretos.

## Consequências

### Positivas

- **DIP demonstrável** — todo use case depende de port (interface), nunca de adapter concreto
- **SRP demonstrável** — 1 use case = 1 arquivo = 1 razão para mudar
- **OCP demonstrável** — adicionar nova implementação de port (ex: novo `NotificationChannel`) não toca use case
- **Testabilidade** — `domain/` e `application/` testáveis com Vitest sem subir nada (puro TS, deps injetadas via fakes)
- **Trocabilidade de adapters** — migrar de Drizzle para outro ORM, ou de Supabase Auth para Lucia, é localizado em `infrastructure/`
- **Mapeamento direto ao livro-texto** — banca reconhece nomes (Hexagonal, Clean Architecture, ports, adapters)
- **Manutenibilidade ISO/IEC 25010** — modifiability é exatamente o atributo que essa estrutura otimiza

### Negativas

- **Boilerplate inicial** — cada módulo tem 4 camadas mesmo quando trivial. Para um CRUD simples isso parece overkill. Mitigação: a estrutura **paga** no primeiro requisito novo; e o overhead serve o objetivo didático.
- **Mais arquivos pequenos** — leitor precisa navegar mais para entender um fluxo. Mitigação: barrel + nomeação clara + diagrama de sequência em `diagrams/`.
- **Risco de over-engineering em módulos pequenos** — `labels/` por exemplo é quase só CRUD; manter as 4 camadas é puro overhead. Aceito por consistência e porque o ganho didático supera o custo.

### Neutras

- Composition root vira responsabilidade explícita do `src/app/` — quem instancia adapters concretos e injeta nos módulos
- Curva inicial de leitura — mas alinhada com expectativa da disciplina

## Alternativas consideradas

### Opção A — MVC clássico (Controllers + Services + Models)

Estrutura tradicional `controllers/`, `services/`, `models/` no topo do projeto.

**Rejeitada porque:**
- Acopla regra de negócio ao framework (model = ActiveRecord do ORM)
- Não evidencia DIP — services dependem direto de models concretos
- Dificulta teste sem framework
- Não dá fronteiras por bounded context (todos os controllers num lugar, todos os services em outro — quebra modularidade do [ADR-0001](./0001-modular-monolith-vs-microservices.md))

### Opção B — Camadas tradicionais sem ports

`controllers/ → services/ → repositories/ → entities/` em cada módulo, com classes concretas sendo importadas diretamente.

**Rejeitada porque:**
- Falha em demonstrar DIP de forma natural — services importam repositories concretos
- Para testar service preciso de banco real ou mock manual elaborado
- Mais difícil substituir adapter sem mexer em camadas superiores

### Opção C — Hexagonal puro (sem distinção entre application/use-cases e application/ports)

Domain no centro, adapters de in/out na borda, sem a divisão Clean entre `use-cases` e `ports`.

**Rejeitada porque:**
- Clean Architecture adiciona o conceito de **use case como entidade explícita** — uma classe por operação de negócio. Isso evidencia SRP melhor do que serviços de domínio com vários métodos.
- A separação `application/use-cases/` vs `application/ports/` melhora navegação e leitura.

## Referências

- Cockburn, A. — [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) (2005)
- Martin, R. C. — *Clean Architecture* (2017), cap. 22 (The Clean Architecture)
- Vernon, V. — *Implementing Domain-Driven Design* (2013), cap. 4 (Architecture)
- ISO/IEC 25010:2023 — Maintainability (Modifiability, Testability)
- [ADR-0001](./0001-modular-monolith-vs-microservices.md) — decomposição macro
