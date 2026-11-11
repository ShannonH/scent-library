-- Minimal stand-ins for the parts of Supabase the migration depends on, so the
-- RLS policies can be tested against a plain local Postgres. Not for production:
-- a real Supabase project already has all of this.
create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (id uuid primary key);
-- Supabase reads the caller's id from the JWT; here we read it from a setting.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
grant usage on schema storage to anon, authenticated;
grant all on storage.objects to authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;

-- Mimic a project created with "Automatically expose new tables" turned OFF:
-- no default table privileges, so the migrations must grant what the app needs.
-- (Set PGTEST_AUTO_EXPOSE=1 to test the "on" setting instead.)
grant usage on schema public to anon;
\if :{?auto_expose}
alter default privileges in schema public grant all on tables to anon, authenticated;
\endif
