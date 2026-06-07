-- ============================================================================
-- issues RLS — issues have NO direct workspace_id; they reach a workspace through
-- projects (issues.project_id -> projects.id -> projects.workspace_id). The EXISTS
-- join is indexed (issues_project_status_idx on project_id, projects pk).
-- ============================================================================

alter table public.issues enable row level security;

create policy "issues_select_if_member"
on public.issues for select to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = issues.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "issues_insert_if_member"
on public.issues for insert to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = issues.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "issues_update_if_member"
on public.issues for update to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = issues.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = issues.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "issues_delete_if_member"
on public.issues for delete to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = issues.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);
