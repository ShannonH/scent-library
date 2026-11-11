-- RLS checks: two users, each must only ever see and change their own rows.
-- Run with scripts/test-rls.sh (local Postgres) — any failed assert aborts.
\set ON_ERROR_STOP on

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
  execute 'set role authenticated';
end $$;

-- ── Alice creates data ──
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.profiles (user_id, likes) values (auth.uid(), '{pear}');
insert into public.scents (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Alice One'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Alice Two');
insert into public.dupes (original_id, dupe_id, level)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'dupe_of');
insert into storage.objects (bucket_id, name)
  values ('scent-photos', '11111111-1111-1111-1111-111111111111/a.jpg');
reset role;

-- ── Bob creates data and tries to reach Alice's ──
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
insert into public.scents (id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Bob One');

do $$
declare n int;
begin
  select count(*) into n from public.scents;
  assert n = 1, format('Bob should see only his 1 scent, saw %s', n);
  select count(*) into n from public.profiles;
  assert n = 0, 'Bob must not see Alice''s profile';
  select count(*) into n from public.dupes;
  assert n = 0, 'Bob must not see Alice''s dupes';
  select count(*) into n from storage.objects;
  assert n = 0, 'Bob must not see Alice''s photos';

  update public.scents set name = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'Bob must not update Alice''s scent';

  delete from public.scents where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'Bob must not delete Alice''s scent';

  begin
    insert into public.scents (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'planted');
    assert false, 'Bob must not insert rows owned by Alice';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.scents set user_id = '11111111-1111-1111-1111-111111111111'
      where id = 'bbbbbbbb-0000-0000-0000-000000000001';
    assert false, 'Bob must not hand his row to Alice';
  exception when insufficient_privilege then null;
  end;

  -- Linking Bob's card to Alice's card must fail the composite foreign key.
  begin
    insert into public.dupes (original_id, dupe_id, level)
      values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'inspired_by');
    assert false, 'Bob must not link to Alice''s scent';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into storage.objects (bucket_id, name)
      values ('scent-photos', '11111111-1111-1111-1111-111111111111/planted.jpg');
    assert false, 'Bob must not upload into Alice''s photo folder';
  exception when insufficient_privilege then null;
  end;

  insert into storage.objects (bucket_id, name)
    values ('scent-photos', '22222222-2222-2222-2222-222222222222/b.jpg');
end $$;
reset role;

-- ── Signed-out visitors see nothing ──
set role anon;
do $$
begin
  perform 1 from public.scents;
  assert false, 'anon must not read scents';
exception when insufficient_privilege then null;
end $$;
reset role;

-- ── Alice's data is intact; checks and cascades work ──
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
do $$
declare n int;
begin
  select count(*) into n from public.scents where name = 'Alice One';
  assert n = 1, 'Alice''s scent should be untouched';

  begin
    insert into public.scents (name, status) values ('bad', 'maybe');
    assert false, 'invalid status must be rejected';
  exception when check_violation then null;
  end;

  begin
    insert into public.scents (name, purposes) values ('bad', '{gym}');
    assert false, 'invalid purpose must be rejected';
  exception when check_violation then null;
  end;

  delete from public.scents where id = 'aaaaaaaa-0000-0000-0000-000000000002';
  select count(*) into n from public.dupes;
  assert n = 0, 'deleting a scent should remove its dupe links';
end $$;
reset role;

select 'RLS tests passed' as result;
