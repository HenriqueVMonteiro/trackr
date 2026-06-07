-- ============================================================================
-- projects RLS — scoped to membership of the owning workspace.
-- projects.workspace_id (text) -> workspaces.id. Indexed by projects_workspace_idx.
-- ============================================================================

alter table public.projects enable row level security;

create policy "projects_select_if_member"
on public.projects for select to authenticated
using ( workspace_id in (select private.user_workspace_ids()) );

create policy "projects_insert_if_member"
on public.projects for insert to authenticated
with check ( workspace_id in (select private.user_workspace_ids()) );

create policy "projects_update_if_member"
on public.projects for update to authenticated
using      ( workspace_id in (select private.user_workspace_ids()) )
with check ( workspace_id in (select private.user_workspace_ids()) );

create policy "projects_delete_if_member"
on public.projects for delete to authenticated
using ( workspace_id in (select private.user_workspace_ids()) );
