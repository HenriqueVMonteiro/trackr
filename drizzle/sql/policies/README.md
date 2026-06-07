# RLS policies (ADR-0004)

Database-enforced multi-tenant isolation for Trackr. Tenancy is workspace-scoped:
a user belongs to workspaces via `workspace_members`; workspaces own projects;
projects own issues, labels, and (through issues) comments.

These are **raw SQL** on purpose — `drizzle-kit` does not reliably diff/apply
policy SQL (orm#3504), so this folder is the source of truth.

## Apply order

Run **after** the base schema migration (Agent A) created the tables, in numeric
order:

```bash
for f in drizzle/sql/policies/[0-9]*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

| File | Contents |
|------|----------|
| `00_helpers.sql`     | `private` schema + `SECURITY DEFINER` membership helpers (must run first) |
| `10_users.sql`       | `auth.users → public.users` sync trigger + `users` RLS |
| `20_workspaces.sql`  | `workspaces` + `workspace_members` RLS |
| `30_projects.sql`    | `projects` RLS |
| `40_issues.sql`      | `issues` RLS (joins to workspace via `projects`) |
| `50_comments.sql`    | `comments` RLS (member read/insert; author update/delete) |
| `60_labels.sql`      | `labels` RLS |
| `65_issue_labels.sql`| `issue_labels` junction RLS (member, via issues→projects) |
| `70_activity.sql`    | `activity` audit log RLS (member read-only; system writes bypass) |
| `75_outbox.sql`      | `outbox` RLS (authenticated insert only; relay reads via service_role) |

Every table that has RLS *enabled* is covered; any table left without RLS is open
to `authenticated`, so all user-reachable tables get a policy here. `outbox` is
service-internal — see the decision note in `75_outbox.sql` (coordinate the final
role policy with Agent A, who owns the relay worker).

## Design (reconciled with Agent A's actual schema)

- **Ownership = `workspaces.owner_id`**, not membership role — `workspace_role` is
  only `('owner','member')` (no `admin`), and basing write authority on `owner_id`
  fixes the bootstrap (owner seeds the first membership row right after creating
  the workspace).
- **Workspace ids are `text`**, so `private.user_workspace_ids()` /
  `user_owned_workspace_ids()` return `setof text` (not `uuid`).
- `auth.uid()` is `uuid` and matches `workspace_members.user_id` / `users.id`.
- `issues` has **no** `workspace_id`; policies reach the workspace through
  `projects`. Same for `comments` (via issues→projects) and `labels` (via projects).

## Performance invariants (do not regress)

- `auth.uid()` is always `(select auth.uid())` — evaluated once per statement (initPlan).
- Membership helpers are `STABLE` and invoked as `(select private.…())`.
- All policies are `TO authenticated` (never evaluated for `anon`).
- `SECURITY DEFINER` helpers read `workspace_members`/`workspaces` without their RLS
  → no recursive-policy errors; hardened with `set search_path = ''` and `EXECUTE`
  granted only to `authenticated`.
- Every policy column is already indexed by Agent A's schema (verified in
  `00_helpers.sql`); no duplicate indexes are created.

## Verification (deferred to B12)

The acceptance test "RLS blocks access to another user's workspace" runs against a
real Postgres in the **B12** integration suite (`tests/integration/`), since it
needs a live database. The SQL here is the unit under test there.
