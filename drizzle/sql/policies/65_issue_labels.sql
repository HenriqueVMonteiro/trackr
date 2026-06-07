-- ============================================================================
-- issue_labels (issue <-> label junction) RLS. A table WITHOUT RLS enabled is
-- open to every authenticated user, so this junction must be locked to the same
-- workspace boundary as issues, or it leaks which labels are on which issues.
-- issue_labels(issue_id text -> issues.id, label_id text -> labels.id).
-- Reached through issues -> projects -> workspaces.
-- ============================================================================

alter table public.issue_labels enable row level security;

create policy "issue_labels_select_if_member"
on public.issue_labels for select to authenticated
using (
  exists (
    select 1
    from public.issues i
    join public.projects p on p.id = i.project_id
    where i.id = issue_labels.issue_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "issue_labels_insert_if_member"
on public.issue_labels for insert to authenticated
with check (
  exists (
    select 1
    from public.issues i
    join public.projects p on p.id = i.project_id
    where i.id = issue_labels.issue_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "issue_labels_delete_if_member"
on public.issue_labels for delete to authenticated
using (
  exists (
    select 1
    from public.issues i
    join public.projects p on p.id = i.project_id
    where i.id = issue_labels.issue_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);
