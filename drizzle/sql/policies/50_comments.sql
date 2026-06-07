-- ============================================================================
-- comments RLS — reach a workspace through issues -> projects. Read/insert by any
-- workspace member; update/delete restricted to the comment's author.
-- comments(issue_id text -> issues.id, author_id uuid -> users.id).
-- ============================================================================

alter table public.comments enable row level security;

create policy "comments_select_if_member"
on public.comments for select to authenticated
using (
  exists (
    select 1
    from public.issues i
    join public.projects p on p.id = i.project_id
    where i.id = comments.issue_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "comments_insert_by_member_author"
on public.comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.issues i
    join public.projects p on p.id = i.project_id
    where i.id = comments.issue_id
      and p.workspace_id in (select private.user_workspace_ids())
  )
);

create policy "comments_update_by_author"
on public.comments for update to authenticated
using      ( author_id = (select auth.uid()) )
with check ( author_id = (select auth.uid()) );

create policy "comments_delete_by_author"
on public.comments for delete to authenticated
using ( author_id = (select auth.uid()) );
