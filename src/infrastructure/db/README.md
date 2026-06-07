# Database

Drizzle ORM + Postgres (Supabase).

## Estrutura

```
src/infrastructure/db/
├── client.ts                # createDbClient factory (injetada nos módulos)
└── schema/
    ├── enums.ts             # pgEnum compartilhado
    ├── users.ts             # mirror de auth.users (sincronizado por trigger no B1)
    ├── workspaces.ts        # workspaces + workspace_members
    ├── projects.ts          # projects + contador de issue number
    ├── labels.ts            # labels por projeto
    ├── issues.ts            # issues + issue_labels (m:n) + self-ref parent (Composite)
    ├── comments.ts          # comments em issues
    ├── activity.ts          # snapshots (Memento) do estado da issue antes/depois
    ├── outbox.ts            # outbox pattern (ADR-0007)
    └── index.ts             # barrel
```

**Áreas do Agente B** (adicionadas nos stints B1/B2/B4/B6/B9):

- `auth-rls/` policies (SQL puro em `drizzle/sql/policies/`)
- `webhooks.ts`
- `notifications.ts`
- `sprints.ts`
- `timetracking.ts`

## Migrations

```bash
# gera migration baseada em diff do schema atual
npm run db:generate

# aplica migrations pendentes (idempotente)
npm run db:migrate

# UI do banco (admin)
npm run db:studio
```

## IDs

Strings com prefixo + nanoid(21):

- `wsp_*` workspaces
- `prj_*` projects
- `iss_*` issues
- `lbl_*` labels
- `cmt_*` comments
- `act_*` activity
- `out_*` outbox

Geração em `src/shared/ids` (entregue no A4).

`users.id` é UUID porque mirror de `auth.users` (Supabase).

## Composition root

`createDbClient(databaseUrl)` é chamado **uma vez** no bootstrap de `src/app/` e o
client resultante é injetado nos módulos via factory function. Nenhum módulo importa
`./client.ts` diretamente — recebe `Database` como dependência.
