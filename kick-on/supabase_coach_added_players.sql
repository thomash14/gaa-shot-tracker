-- =====================================================================
-- Coach-added players — Phase 1
-- =====================================================================
-- Lets a coach add players to their team directly, without the player
-- signing up first. A coach-added player is a real `profiles` row with a
-- generated UUID that is NOT linked to an auth account, plus a
-- `team_members` row with role 'player'. Because they are real profiles,
-- they work everywhere that keys off profiles(id): the member list, the
-- coach match-review player pool, and drill assignments. They simply have
-- no login until a real account is later linked to them.
--
-- Run this manually in the Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tracking columns on profiles (used for the future "link on signup")
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_coach_added boolean not null default false;

alter table public.profiles
  add column if not exists added_by uuid;

-- ---------------------------------------------------------------------
-- 2. Relax the auth.users foreign keys
-- ---------------------------------------------------------------------
-- Coach-added profiles/memberships use a generated UUID that does not exist
-- in auth.users, so any FK from these tables to auth.users must be dropped.
-- This is name-agnostic: it finds and drops whichever FK(s) reference
-- auth.users, whatever they are called. Real signups still set
-- profiles.id = auth.uid() via the existing trigger, so nothing else changes
-- except that the database no longer enforces that link.
do $$
declare
  r record;
begin
  for r in
    select rel.relname as tbl, con.conname
    from pg_constraint con
    join pg_class rel       on rel.oid = con.conrelid
    join pg_namespace ns    on ns.oid = rel.relnamespace
    join pg_class frel      on frel.oid = con.confrelid
    join pg_namespace fns   on fns.oid = frel.relnamespace
    where con.contype = 'f'
      and ns.nspname = 'public'
      and rel.relname in ('profiles', 'team_members')
      and fns.nspname = 'auth'
      and frel.relname = 'users'
  loop
    execute format('alter table public.%I drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 3. add_coach_player() — SECURITY DEFINER RPC
-- ---------------------------------------------------------------------
-- Creates a coach-added player. Runs as the function owner so it can insert
-- into profiles/team_members despite RLS, but only after verifying the
-- caller is a coach of the target team. If no email is supplied a unique
-- placeholder is generated so the profile can be created without a real
-- mailbox.
create or replace function public.add_coach_player(
  p_team_id uuid,
  p_name    text,
  p_email   text default null
)
returns table (
  member_id    uuid,
  player_id    uuid,
  display_name text,
  email        text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := gen_random_uuid();
  v_email     text;
  v_member_id uuid;
  v_name      text := trim(p_name);
begin
  -- Authorise: caller must be a coach of this team.
  if not exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.role = 'coach'
  ) then
    raise exception 'Not authorised to add players to this team';
  end if;

  if coalesce(v_name, '') = '' then
    raise exception 'Player name is required';
  end if;

  v_email := nullif(trim(p_email), '');
  if v_email is null then
    v_email := 'player-' || v_uid::text || '@placeholder.kickon.app';
  end if;

  insert into public.profiles (id, display_name, email, is_coach_added, added_by)
  values (v_uid, v_name, v_email, true, auth.uid());

  insert into public.team_members (team_id, user_id, role, share_with_coach, share_match_data)
  values (p_team_id, v_uid, 'player', false, false)
  returning id into v_member_id;

  return query select v_member_id, v_uid, v_name, v_email;
end;
$$;

grant execute on function public.add_coach_player(uuid, text, text) to authenticated;
