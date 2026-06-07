-- ============================================================================
-- labels RLS — labels belong to a project (labels.project_id -> projects.id), so
-- reach a workspace through projects. Any workspace member can manage labels.
-- ============================================================================

alter table public.labels enable row level security;

create policy "labels_select_if_member"
on public.labels for select to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = labels.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "labels_insert_if_member"
on public.labels for insert to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = labels.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "labels_update_if_member"
on public.labels for update to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = labels.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = labels.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "labels_delete_if_member"
on public.labels for delete to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = labels.project_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);
