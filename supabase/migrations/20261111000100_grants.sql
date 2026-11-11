-- Explicit table privileges for signed-in users.
--
-- New Supabase projects can be created with "Automatically expose new tables"
-- turned off (the recommended setting). Then tables get no privileges by
-- default and the app fails with "permission denied". Granting them here makes
-- the schema work either way. Row-level security still limits every query to
-- the caller's own rows; signed-out visitors (anon) stay locked out.
--
-- Safe to run more than once.

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.scents, public.dupes to authenticated;
revoke all on public.profiles, public.scents, public.dupes from anon;
