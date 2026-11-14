-- BloxyBox: provision accounts that existed before the BloxyBox schema was installed.
--
-- The on_auth_user_created trigger (migration 200) only runs for NEW sign-ups.
-- Projects that already had users in auth.users would otherwise leave those
-- users without a profile, wallet, avatar and stats, and the app could not
-- load their data. This migration fills that gap.
--
-- Safety: insert-only and idempotent. It never updates or deletes existing rows,
-- never touches auth.users, and skips every user who already has a BloxyBox
-- profile, so running it again is a no-op.

create function public._backfill_existing_users()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user record;
  v_requested text;
  v_username text;
  v_display text;
  v_attempt integer;
  v_count integer := 0;
begin
  for v_user in
    select u.id, u.raw_user_meta_data
    from auth.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
    order by u.created_at, u.id
  loop
    v_requested := lower(btrim(coalesce(v_user.raw_user_meta_data ->> 'username', '')));
    v_username := v_requested;
    v_attempt := 0;

    loop
      if v_username !~ '^[a-z0-9_]{3,20}$' or v_attempt > 0 then
        v_username := 'player_' || substr(md5(v_user.id::text || v_attempt::text), 1, 8);
      end if;

      v_display := left(coalesce(
        nullif(btrim(v_user.raw_user_meta_data ->> 'display_name'), ''),
        nullif(btrim(v_user.raw_user_meta_data ->> 'full_name'), ''),
        nullif(v_requested, ''),
        v_username), 30);
      if char_length(btrim(v_display)) = 0 then
        v_display := v_username;
      end if;

      begin
        insert into public.profiles (id, username, display_name)
        values (v_user.id, v_username, v_display);
        exit;
      exception when unique_violation then
        v_attempt := v_attempt + 1;
        if v_attempt > 5 then
          raise;
        end if;
      end;
    end loop;

    perform public._provision_starter_state(v_user.id, 'welcome_bonus');
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public._backfill_existing_users() from public, anon, authenticated;

select public._backfill_existing_users();

insert into public.app_meta (key, value) values ('schema_version', '20261114000800')
on conflict (key) do update set value = excluded.value;
