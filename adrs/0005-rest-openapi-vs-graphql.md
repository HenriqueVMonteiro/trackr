# ADR-0005: REST + OpenAPI vs GraphQL vs gRPC

## Status

Accepted (2026-06-07)

## Contexto

Trackr precisa expor sua interface programática para três tipos de consumidor:

1. UI Next.js cliente (Server Components + Server Actions)
2. Webhooks/integrações externas (Slack, Discord, GitHub, scripts CI)
3. Banca avaliadora — que vai inspecionar a especificação como artefato do trabalho

O edital obriga uma especificação formal de design de API em formato apropriado: **OpenAPI 3.x para REST, schema SDL para GraphQL, ou arquivos .proto para gRPC**.

Forças em jogo:

- **Manutenibilidade** — atributo prioritário ([ADR-0001](./0001-modular-monolith-vs-microservices.md)). Especificação não pode divergir do código.
- **Manutenção de contrato** — o que muda quando adicionamos um campo numa entidade? Quanto custa versionar?
- **Tooling** — banca, friend's agent e a UI precisam de ferramental sem barreira de entrada (curl, Postman, browser, fetch nativo)
- **Suporte do framework** — Next.js 15 tem route handlers REST nativos; GraphQL exige bibliotecas extras; gRPC exige runtime separado em Node + browser proxy
- **Auth** — Supabase Auth emite JWT, fluxo padrão REST `Authorization: Bearer`. Em GraphQL precisa adaptar; em gRPC precisa interceptors customizados
- **Geração de spec a partir do código** — queremos *single source of truth*. O ideal: schema de validação = schema da spec

## Decisão

Adotamos **REST + OpenAPI 3.1**, com OpenAPI gerada automaticamente a partir de schemas Zod via `@asteasolutions/zod-to-openapi`.

Convenções:

- **Base path**: `/api/v1/...` — versionamento por URL ([Microsoft API guidelines](https://github.com/microsoft/api-guidelines))
- **Resource naming**: substantivos no plural (`/workspaces`, `/projects`, `/issues`)
- **Sub-resources**: aninhamento até dois níveis (`/workspaces/{id}/projects`, `/projects/{id}/issues`)
- **Métodos**: `GET` lista/busca; `POST` cria; `PATCH` atualização parcial; `PUT` substitui; `DELETE` remove
- **Status codes**: 2xx sucesso, 4xx cliente, 5xx servidor
- **Erros**: [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807) com `application/problem+json` — formato padronizado, machine-readable, com `type`, `title`, `status`, `detail` e campos extra contextuais
- **Paginação**: cursor opaco (base64 de `(updatedAt, id)`) com `?cursor=...&limit=...` (default 50, max 200), resposta inclui `next_cursor`
- **Auth**: `Authorization: Bearer <jwt-supabase>` em todos endpoints exceto `/api/v1/health`
- **Idempotência**: header `Idempotency-Key` opcional em mutações; servidor armazena e devolve resposta em retry
- **Geração**: `scripts/generate-openapi.ts` lê a registry Zod e emite `openapi/trackr.json` — Zod é a fonte da verdade

## Consequências

### Positivas

- **Zero drift entre spec e código** — Zod schemas validam input *e* alimentam OpenAPI. Mudar um campo numa entidade dispara erro no schema antes do PR mergear.
- **Tooling universal** — curl/Postman/HTTPie funcionam; banca pode testar com browser; UI Next.js usa `fetch` nativo
- **Auth padrão** — JWT no header funciona em qualquer cliente, inclusive Supabase Auth
- **Endpoints como módulos Next.js** — `src/app/api/v1/<path>/route.ts` é o jeito canônico do App Router; sem layer adicional
- **Manutenibilidade alta** — atributo prioritário (ISO/IEC 25010); refactor do schema é refactor do código + spec ao mesmo tempo
- **Errors estruturados** — RFC 7807 dá ao cliente UI informação suficiente para fazer mensagens de erro localizadas sem parsing custom

### Negativas

- **Verbosidade comparado a GraphQL** para consultas combinadas — cliente UI precisa fazer múltiplos GETs (workspace + projetos + issues) em vez de uma query única. Aceito porque o cache HTTP + cursor pagination resolvem o problema na prática, e o caso de uso de combinação massiva não é central
- **Versionamento explícito (v1, v2)** quando GraphQL evoluiria em campos individuais. Aceito porque /v2 é honesto sobre breaking changes
- **Generação de spec exige script** — `npm run openapi:generate` precisa rodar e commitar. CI poderia falhar PR se spec não foi regenerada. Mitigação: pré-commit hook (futuro)

### Neutras

- A spec gerada é em **JSON** (`openapi/trackr.json`) por simplicidade. Caller que precisar YAML pode converter (`yq -P openapi/trackr.json > openapi/trackr.yaml`)
- OpenAPI 3.1 escolhido sobre 3.0 porque suporta `JSON Schema 2020-12` (alinhado com Zod) e elimina divergências

## Alternativas consideradas

### Opção A — GraphQL com SDL (Apollo Server, Yoga, Pothos)

Queries flexíveis, schema SDL como contrato.

**Rejeitada porque:**

- Adiciona um runtime de query parsing/execution
- Exige loaders (DataLoader) para evitar N+1 — complexidade adicional
- Caching HTTP padrão (ETag, max-age) não funciona naturalmente
- Auth Supabase exige adaptação no contexto da query
- Banca de Arquitetura de Software espera padrões reconhecíveis; REST é o padrão de fato em CRUD-like
- Para fluxos não-CRUD (transição de issue, batched mutations), GraphQL não traz vantagem aqui

### Opção B — gRPC com .proto

Binary protocol, contratos type-safe end-to-end.

**Rejeitada porque:**

- Browsers não falam gRPC nativo — precisa de proxy gRPC-Web ou Connect
- Setup pesado (build de proto, generators)
- Tooling de inspeção (grpcurl, BloomRPC) é menos disseminado que REST
- Não cobre o uso desde a UI Next.js sem adaptação

### Opção C — tRPC

Type-safe TS-only, sem schema externo.

**Rejeitada porque:**

- Funciona bem para mono-repo TS (UI + backend), mas **falha o requisito do edital de "especificação formal de design de API"**
- Webhooks externos (não-TS) ficam sem contrato legível
- Versão e introspecção fora do TypeScript não existem

## Referências

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807)
- [@asteasolutions/zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi)
- Fielding, R. — *Architectural Styles and the Design of Network-based Software Architectures* (2000), cap. 5 (REST)
- Microsoft API Guidelines — [URL versioning vs header](https://github.com/microsoft/api-guidelines)
- [ADR-0001](./0001-modular-monolith-vs-microservices.md), [ADR-0002](./0002-hexagonal-clean-architecture-per-module.md)
