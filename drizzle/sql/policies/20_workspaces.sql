-- ============================================================================
-- workspaces + workspace_members RLS (default-deny once enabled).
-- ============================================================================

alter table public.workspaces enable row level security;

create policy "workspaces_select_if_member"
on public.workspaces for select to authenticated
using ( id in (select private.user_workspace_ids()) );

create policy "workspaces_insert_by_owner"
on public.workspaces for insert to authenticated
with check ( owner_id = (select auth.uid()) );

create policy "workspaces_update_by_owner"
on public.workspaces for update to authenticated
using      ( id in (select private.user_owned_workspace_ids()) )
with check ( id in (select private.user_owned_workspace_ids()) );

create policy "workspaces_delete_by_owner"
on public.workspaces for delete to authenticated
using ( id in (select private.user_owned_workspace_ids()) );

-- ----------------------------------------------------------------------------
alter table public.workspace_members enable row level security;

-- Read: your own membership rows, plus all members of workspaces you belong to.
create policy "members_select_self_and_comembers"
on public.workspace_members for select to authenticated
using (
  user_id = (select auth.uid())
  or workspace_id in (select private.user_workspace_ids())
);

-- Write authority: the workspace owner (by workspaces.owner_id). The owner can
-- seed their own membership row immediately after creating the workspace.
create policy "members_insert_by_owner"
on public.workspace_members for insert to authenticated
with check ( workspace_id in (select private.user_owned_workspace_ids()) );

create policy "members_update_by_owner"
on public.workspace_members for update to authenticated
using      ( workspace_id in (select private.user_owned_workspace_ids()) )
with check ( workspace_id in (select private.user_owned_workspace_ids()) );

create policy "members_delete_by_owner"
on public.workspace_members for delete to authenticated
using ( workspace_id in (select private.user_owned_workspace_ids()) );
