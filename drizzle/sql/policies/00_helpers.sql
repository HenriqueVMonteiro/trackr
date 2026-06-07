-- ============================================================================
-- ADR-0004 RLS helpers — run FIRST (other policy files depend on these).
-- Apply AFTER Agent A's base schema migration (tables must already exist).
--
-- Reconciled against src/infrastructure/db/schema (B1, Agente B):
--   workspaces.id        text   (NOT uuid)  -> helpers return `setof text`
--   workspaces.owner_id  uuid   (= auth.users.id)
--   workspace_members(workspace_id text, user_id uuid, role workspace_role)
--   workspace_role enum = ('owner','member')  -- there is NO 'admin'
-- ============================================================================

create schema if not exists private;

-- Workspaces the current user is a MEMBER of (read access boundary).
-- SECURITY DEFINER reads workspace_members WITHOUT its RLS -> no recursion.
-- STABLE + invoked as (select ...) -> evaluated once per statement (initPlan).
create or replace function private.user_workspace_ids()
returns setof text
language sql
security definer
set search_path = ''
stable
as $$
  select wm.workspace_id
  from public.workspace_members wm
  where wm.user_id = (select auth.uid());
$$;

-- Workspaces the current user OWNS (write authority). Based on workspaces.owner_id
-- (the source of truth) rather than membership role, which also fixes the
-- bootstrap: the owner can seed the first membership row right after creating the
-- workspace, before any membership exists.
create or replace function private.user_owned_workspace_ids()
returns setof text
language sql
security definer
set search_path = ''
stable
as $$
  select w.id
  from public.workspaces w
  where w.owner_id = (select auth.uid());
$$;

-- User ids that share at least one workspace with the current user (for the
-- public.users mirror select policy).
create or replace function private.user_visible_user_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select distinct other.user_id
  from public.workspace_members me
  join public.workspace_members other on other.workspace_id = me.workspace_id
  where me.user_id = (select auth.uid());
$$;

-- Hardening: the definer functions must not be callable by anon/public.
revoke all on function private.user_workspace_ids() from public, anon;
revoke all on function private.user_owned_workspace_ids() from public, anon;
revoke all on function private.user_visible_user_ids() from public, anon;
grant execute on function private.user_workspace_ids() to authenticated;
grant execute on function private.user_owned_workspace_ids() to authenticated;
grant execute on function private.user_visible_user_ids() to authenticated;

-- NOTE: no indexes are created here. Every column referenced by the policies is
-- already indexed by Agent A's schema (workspaces_owner_idx, workspace_members PK
-- + workspace_members_user_idx, projects_workspace_idx, issues_project_*_idx,
-- comments_issue_idx, labels_project_idx). Verified — do not duplicate.
