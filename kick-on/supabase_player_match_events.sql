-- =====================================================================
-- Coach Match Review — Phase 2 schema (player reviews their stats)
-- =====================================================================
-- Players open a coach-created game that was sent to them and log their own
-- match events (possessions, shots, turnovers, assists, kickouts), optionally
-- pinned to a location on the pitch. Submitting marks their review complete.
--
-- Run this manually in the Supabase SQL editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. player_match_events — one row per logged event
-- ---------------------------------------------------------------------
create table if not exists public.player_match_events (
  id             uuid primary key default gen_random_uuid(),
  coach_match_id uuid not null references public.coach_matches(id) on delete cascade,
  player_id      uuid not null references public.profiles(id),
  event_type     text not null check (event_type in (
                   'possession', 'shot', 'turnover_won', 'turnover_lost', 'assist', 'kickout')),
  x_position     float,   -- nullable: only set when marked on the map
  y_position     float,   -- nullable
  outcome        text,    -- nullable: scored_point, scored_goal, turned_over, fouled,
                          --           passed_off, scored, missed, blocked, wide, won, lost
  assist_type    text,    -- nullable: goal, point
  created_at     timestamptz not null default now()
);

create index if not exists idx_player_match_events_match_id  on public.player_match_events(coach_match_id);
create index if not exists idx_player_match_events_player_id on public.player_match_events(player_id);

-- ---------------------------------------------------------------------
-- 2. Review-status columns on coach_match_players
-- ---------------------------------------------------------------------
alter table public.coach_match_players
  add column if not exists reviewed boolean not null default false;

alter table public.coach_match_players
  add column if not exists reviewed_at timestamptz;

-- =====================================================================
-- Row Level Security — player_match_events
-- =====================================================================
alter table public.player_match_events enable row level security;

-- Players may create/update/delete only their own events.
create policy "players insert own events"
  on public.player_match_events
  for insert
  with check (player_id = auth.uid());

create policy "players update own events"
  on public.player_match_events
  for update
  using (player_id = auth.uid())
  with check (player_id = auth.uid());

create policy "players delete own events"
  on public.player_match_events
  for delete
  using (player_id = auth.uid());

-- Players may read events for any match they are part of (covers their own).
create policy "players read events for their matches"
  on public.player_match_events
  for select
  using (
    exists (
      select 1 from public.coach_match_players cmp
      where cmp.coach_match_id = player_match_events.coach_match_id
        and cmp.player_id = auth.uid()
    )
  );

-- Coaches may read all events for matches on teams they coach.
create policy "coaches read team events"
  on public.player_match_events
  for select
  using (
    exists (
      select 1
      from public.coach_matches cm
      join public.team_members tm on tm.team_id = cm.team_id
      where cm.id = player_match_events.coach_match_id
        and tm.user_id = auth.uid()
        and tm.role = 'coach'
    )
  );

-- =====================================================================
-- submit_player_review() — mark the caller's review complete
-- =====================================================================
-- Players only have READ on coach_match_players (Phase 1), so flipping the
-- reviewed flag goes through a SECURITY DEFINER function scoped to the
-- caller's own row — they cannot edit their position or anything else.
create or replace function public.submit_player_review(p_coach_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coach_match_players
  set reviewed = true,
      reviewed_at = now()
  where coach_match_id = p_coach_match_id
    and player_id = auth.uid();

  if not found then
    raise exception 'No player row found to mark as reviewed';
  end if;
end;
$$;

grant execute on function public.submit_player_review(uuid) to authenticated;
