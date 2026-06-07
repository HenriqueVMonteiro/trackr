-- ============================================================================
-- activity (audit log of issue changes — GoF: Memento snapshots) RLS.
-- Holds actor + before/after snapshots + diff per issue change. Without RLS it
-- leaks who changed what across workspaces. Read-only for members; rows are
-- written by the system (event subscribers / outbox relay) via a privileged role
-- that bypasses RLS, so NO insert/update/delete policy is granted to authenticated.
-- activity(issue_id text -> issues.id, actor_id uuid). Reached via issues -> projects.
-- ============================================================================

alter table public.activity enable row level security;

create policy "activity_select_if_member"
on public.activity for select to authenticated
using (
  exists (
    select 1
    from public.issues i
    join public.projects p on p.id = i.project_id
    where i.id = activity.issue_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);
