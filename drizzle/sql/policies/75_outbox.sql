-- ============================================================================
-- outbox (ADR-0007 transactional outbox) RLS.
-- The outbox is service-internal: state-changing use cases INSERT a row in the
-- same transaction as the business write, and a separate relay worker reads
-- unpublished rows and marks them published.
--
-- Decision (coordinate final role policy with Agent A, who owns the relay):
--   * INSERT is allowed for `authenticated` so the same-transaction outbox write
--     in a use case is NOT blocked once the request path runs as `authenticated`.
--   * NO select/update/delete policy for `authenticated` -> the user path cannot
--     read or mutate the outbox. The relay reads + marks published via a
--     privileged role (service_role / table owner) that BYPASSES RLS.
-- This is safe under both request-path role designs: if writes run as the owner
-- role, RLS is bypassed anyway; if they run as `authenticated`, the insert is
-- permitted while reads stay locked.
-- ============================================================================

alter table public.outbox enable row level security;

create policy "outbox_insert_authenticated"
on public.outbox for insert to authenticated
with check (true);
