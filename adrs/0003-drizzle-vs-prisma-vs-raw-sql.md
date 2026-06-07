# ADR-0003: Drizzle ORM vs Prisma vs raw SQL

## Status

Accepted (2026-06-07)

## Contexto

Trackr precisa de uma camada de acesso a Postgres type-safe em TypeScript. As opções principais consideradas:

- **Drizzle ORM** — biblioteca leve, type-safe sem code-gen pesado, schema declarado em TypeScript, migrations geradas por diff de schema (SQL bruto), API muito próxima de SQL.
- **Prisma** — ORM mais popular, code-gen completo (`prisma generate`), schema próprio (`.prisma`), API fluida, migrations geradas a partir de diff.
- **Raw SQL via `postgres` ou `pg`** — controle total, zero abstração, mas perde type-safety nas queries.
- **Kysely** — query builder type-safe sem ORM completo, próximo do SQL.
- **TypeORM** — ORM histórico Node.js, decorators, decisão fortemente NOT recomendada hoje.

Forças que pesam:

- **Manutenibilidade** (atributo prioritário) — schema versionado em TS, migrations rastreáveis, refactor seguro
- **Performance** — N+1 queries são fáceis com ORM "fluido"; Drizzle/Kysely deixam queries explícitas (próximas a SQL)
- **Compatibilidade com Supabase + RLS** — Supabase usa Postgres puro; RLS via SQL não muda no cliente
- **Equipe pequena, sem DBA** — gerar migrations sem editar SQL manualmente reduz erro humano
- **Dev experience** — schema único, autocomplete em queries, less mocking
- **Bundle / cold start** — Vercel edge functions têm orçamento de cold start; Prisma é pesado, Drizzle é leve
- **Lock-in / saída** — Drizzle e Kysely são query-builders sobre Postgres puro (saída fácil para SQL bruto); Prisma é abstração maior

## Decisão

Adotamos **Drizzle ORM** como camada de persistência principal.

- Schemas em `src/infrastructure/db/schema/<contexto>.ts`
- Migrations geradas via `drizzle-kit generate` (diff do schema → SQL plano em `drizzle/`)
- Cliente em `src/infrastructure/db/client.ts` exposto como factory `createDbClient(connectionString)`
- Adapters em cada módulo (`infrastructure/Drizzle*Repository.ts`) implementam as ports

## Consequências

### Positivas

- **Type safety nas queries** sem code-gen pesado (cold start Vercel preservado)
- **SQL transparente** — quem lê o código vê a query, não uma abstração mágica
- **Migrations versionadas** em `drizzle/` como SQL puro — auditáveis pela banca e por outros agentes
- **Saída fácil** — Drizzle é, em essência, um query-builder; substituir por SQL bruto em um ponto crítico é localizado
- **Compatibilidade com RLS Supabase** — políticas SQL aplicadas no Postgres não dependem do cliente
- **Manutenibilidade alta** — atributo prioritário (ISO/IEC 25010), justificado em ADR-0001

### Negativas

- **Ecossistema menor que Prisma** — menos tutoriais, menos exemplos de comunidade
- **Sem hooks de lifecycle (beforeSave, etc.)** — para validação cross-entity precisamos invocar manualmente; aceito porque preferimos validação explícita em use cases
- **API ainda evoluindo** — quebras de API entre versões 0.2x e 0.3x; aceito porque o pin de versão no package.json controla
- **Sem GUI tipo Prisma Studio embarcada** — usamos `drizzle-kit studio` como substituto

### Neutras

- Curva de aprendizado: API estilo SQL é familiar para quem conhece queries; quem só conhece Prisma precisa se ajustar

## Alternativas consideradas

### Opção A — Prisma

ORM mais popular em Node.js. Code-gen pesado gera client a cada `prisma generate`.

**Rejeitada porque:**

- Bundle do client é grande (~5MB), penaliza cold start Vercel
- Schema próprio em arquivo `.prisma` adiciona uma linguagem (vs TypeScript puro)
- API "fluida" esconde queries — mais difícil de prever N+1
- Saída custosa: queries Prisma não são SQL óbvio
- Já houve issues conhecidos com RLS Supabase pelo cliente Prisma

### Opção B — Raw SQL via `postgres` ou `pg`

Sem abstração. Cada repositório escreve SQL bruto.

**Rejeitada porque:**

- Perde type safety nos resultados (preciso definir interfaces e cast manual)
- Refactor de schema pega errors só em runtime
- Equipe pequena, tempo de migrar coluna sobre toda a base é alto

### Opção C — Kysely (query builder puro)

API muito parecida com Drizzle, mas sem schema declarativo em TS. Schema vem de uma definição de tipos manual.

**Rejeitada porque:**

- Drizzle dá schema declarativo + migrations + querying num pacote único
- Kysely exige acoplamento com `drizzle-kit`-like externo para migrations, ou escrita manual
- Para o escopo acadêmico, ter as três coisas integradas é melhor

### Opção D — TypeORM

ORM histórico baseado em decorators.

**Rejeitada porque:**

- Estado de manutenção do projeto é instável
- Decorators dependem de `experimentalDecorators` e podem conflitar com Next.js
- Comunidade migrando para Prisma/Drizzle

## Referências

- [Drizzle ORM docs](https://orm.drizzle.team/)
- [Prisma performance discussion](https://github.com/prisma/prisma/discussions/4730)
- Vernon, V. — *Implementing Domain-Driven Design* (2013), cap. 12 (Repositories) — o repositório como adapter
- ISO/IEC 25010:2023 — Maintainability (Modifiability)
- [ADR-0002](./0002-hexagonal-clean-architecture-per-module.md) — repositories são ports em `application/`, adapters Drizzle em `infrastructure/`
