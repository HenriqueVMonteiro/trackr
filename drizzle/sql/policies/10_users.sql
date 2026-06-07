-- ============================================================================
-- public.users mirror — sync trigger + RLS.
-- The schema comment in src/infrastructure/db/schema/users.ts states this mirror
-- is "Synchronized via trigger installed in stint B1 (Agente B)" — here it is.
-- ============================================================================

-- Copy each new Supabase auth.users row into public.users so Drizzle FKs resolve.
-- SECURITY DEFINER so it can write public.users regardless of the caller's role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- RLS: a user sees themselves and anyone sharing a workspace. Writes flow through
-- the SECURITY DEFINER trigger / service_role admin path, never the anon role —
-- so no insert/update/delete policy is granted to `authenticated` here.
alter table public.users enable row level security;

create policy "users_select_self_and_comembers"
on public.users for select to authenticated
using (
  id = (select auth.uid())
  or id in (select private.user_visible_user_ids())
);
