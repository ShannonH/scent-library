-- Scent Library: initial schema with row-level security.
--
-- Every table carries user_id, which defaults to the signed-in user and is
-- checked by RLS on every read and write. The browser uses only the public
-- anon key, so these policies are what keep each user's data private.

-- ─── Profiles (taste) ─────────────────────────────────────────────────────────
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  likes text[] not null default '{}',
  dislikes text[] not null default '{}',
  flags text[] not null default '{}',
  lead_only_flags text[] not null default '{}',
  lounge_cues text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ─── Scents ───────────────────────────────────────────────────────────────────
create table public.scents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  brand text not null default '' check (char_length(brand) <= 200),
  gender text not null default 'unknown'
    check (gender in ('feminine', 'masculine', 'unisex', 'unknown')),
  top_notes text[] not null default '{}',
  heart_notes text[] not null default '{}',
  base_notes text[] not null default '{}',
  status text not null default 'curious'
    check (status in ('curious', 'love', 'fine', 'nope', 'hell no', 'predicted-no')),
  have boolean not null default false,
  smelled boolean not null default false,
  price numeric(10, 2) check (price is null or price >= 0),
  where_seen text not null default '' check (char_length(where_seen) <= 500),
  own_notes text not null default '' check (char_length(own_notes) <= 5000),
  purposes text[] not null default '{}'
    check (purposes <@ array['armor', 'lounge']::text[]),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lets dupes reference (id, user_id) so links can only join a user's own cards.
  unique (id, user_id)
);

create index scents_user_updated_idx on public.scents (user_id, updated_at desc);

-- ─── Dupes ────────────────────────────────────────────────────────────────────
create table public.dupes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  original_id uuid not null,
  dupe_id uuid not null,
  level text not null check (level in ('dupe_of', 'has_dna_of', 'inspired_by')),
  created_at timestamptz not null default now(),
  check (original_id <> dupe_id),
  unique (user_id, original_id, dupe_id),
  -- Composite keys: both scents must belong to the same user as the link.
  foreign key (original_id, user_id) references public.scents (id, user_id) on delete cascade,
  foreign key (dupe_id, user_id) references public.scents (id, user_id) on delete cascade
);

create index dupes_original_idx on public.dupes (original_id);
create index dupes_dupe_idx on public.dupes (dupe_id);

-- ─── updated_at triggers ──────────────────────────────────────────────────────
create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger scents_touch before update on public.scents
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─── Row-level security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.scents enable row level security;
alter table public.dupes enable row level security;

-- (select auth.uid()) is evaluated once per query rather than per row.
create policy "profiles: own rows" on public.profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "scents: own rows" on public.scents
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "dupes: own rows" on public.dupes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Signed-out visitors (the anon role) get nothing at all.
revoke all on public.profiles, public.scents, public.dupes from anon;

-- ─── Photo storage ────────────────────────────────────────────────────────────
-- Private bucket; files live at <user_id>/<random>.jpg and are served through
-- short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scent-photos', 'scent-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "scent-photos: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'scent-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "scent-photos: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scent-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "scent-photos: update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'scent-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'scent-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "scent-photos: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'scent-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
